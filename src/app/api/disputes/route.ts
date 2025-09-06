import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertHubSpotContact } from "@/lib/crm/hubspot";

async function retryFetch(url: string, opts?: RequestInit, attempts = 3, backoff = 200) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (err: unknown) {
      lastErr = err;
      // small backoff
  await new Promise<void>((r) => setTimeout(r, backoff * (i + 1)));
      console.error('retryFetch attempt failed', err);
    }
  }
  throw lastErr;
}

export async function POST(request: Request) {
  try {
    const { milestoneId, reason } = await request.json();
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("*, jobs!inner(client_id, tradie_id)")
      .eq("id", milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (
      ![milestone.jobs.client_id, milestone.jobs.tradie_id].includes(user.id)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        milestone_id: milestoneId,
        job_id: milestone.job_id,
        reason,
        status: "pending",
        qbcc_escalated: false,
      })
      .select()
      .single();

    if (disputeError) throw new Error(disputeError.message);

    await supabase.from("notifications").insert([
      {
        user_id: milestone.jobs.client_id,
        message: `Dispute filed for milestone ${milestone.title}`,
        job_id: milestone.job_id,
      },
      {
        user_id: milestone.jobs.tradie_id,
        message: `Dispute filed for milestone ${milestone.title}`,
        job_id: milestone.job_id,
      },
    ]);

    // Best-effort: push to HubSpot as a ticket so support can triage in CRM.
    try {
      const hubToken = process.env.HUBSPOT_TOKEN;
      // Upsert both contacts (client and tradie) so ticket links to contacts
      if (hubToken) {
        // Fetch user emails
        const { data: clientUser } = await supabase.from("users").select("email").eq("id", milestone.jobs.client_id).single();
        const { data: tradieUser } = await supabase.from("users").select("email").eq("id", milestone.jobs.tradie_id).single();
        const clientEmail = clientUser?.email;
        const tradieEmail = tradieUser?.email;
        if (clientEmail) await upsertHubSpotContact(clientEmail, ["client"]).catch(() => {});
        if (tradieEmail) await upsertHubSpotContact(tradieEmail, ["tradie"]).catch(() => {});

        // Create a ticket in HubSpot referencing the dispute and job
        const ticketRes = await fetch("https://api.hubapi.com/crm/v3/objects/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hubToken}`,
          },
          body: JSON.stringify({
            properties: {
              subject: `Dispute: ${milestone.title}`,
              content: `Dispute for milestone ${milestone.title} (job ${milestone.job_id}). Reason: ${reason || "(none)"}. Please triage in TradeMatey.`,
              status: "new",
              source: "TradeMatey",
            },
          }),
        });
        if (ticketRes && ticketRes.ok) {
          try {
            const ticketJson = await ticketRes.json();
            const ticketId = ticketJson?.id;
            if (ticketId) {
              // persist ticket id on the dispute row for tracing
              try {
                await supabase.from('disputes').update({ hubspot_ticket_id: ticketId }).eq('id', dispute.id);
              } catch (err: unknown) {
                // ignore persistence errors but log for observability
                console.error('Failed to persist hubspot_ticket_id', err);
              }
            }
            // Search for contacts and associate them to the ticket
            const contactIds: string[] = [];
            if (clientEmail) {
              const found = await retryFetch(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${hubToken}` },
                  body: JSON.stringify({
                    filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: clientEmail }] }],
                    properties: ["email"],
                    limit: 1,
                  }),
                }
              );
              if (found.ok) {
                const fj = await found.json();
                const cid = fj?.results?.[0]?.id;
                if (cid) contactIds.push(cid);
              }
            }
            if (tradieEmail) {
              const found = await retryFetch(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${hubToken}` },
                  body: JSON.stringify({
                    filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: tradieEmail }] }],
                    properties: ["email"],
                    limit: 1,
                  }),
                }
              );
              if (found.ok) {
                const fj = await found.json();
                const cid = fj?.results?.[0]?.id;
                if (cid) contactIds.push(cid);
              }
            }

            // Associate found contacts to ticket
            for (const cid of contactIds) {
              try {
                await retryFetch(`https://api.hubapi.com/crm/v3/associations/tickets/contacts/batch/create`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${hubToken}` },
                  body: JSON.stringify({ inputs: [{ from: { id: ticketId }, to: { id: cid }, type: "ticket_to_contact" }] }),
                });
              } catch (err: unknown) {
                /* ignore association errors but log */
                console.error('HubSpot association error', err);
              }
            }

            // Optionally send Slack/Teams notification
            const slackWebhook = process.env.SUPPORT_SLACK_WEBHOOK;
            const teamsWebhook = process.env.SUPPORT_TEAMS_WEBHOOK;
            const ticketUrl = `https://app.hubspot.com/contacts/${ticketJson?.portalId || ""}/ticket/${ticketId}`;
            const message = `New dispute ticket created: ${milestone.title} (job ${milestone.job_id})\nTicket: ${ticketUrl}`;
            if (slackWebhook) {
              try {
                await retryFetch(slackWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) }, 2, 100);
              } catch (err: unknown) {
                console.error('Slack notify failed', err);
              }
            }
            if (teamsWebhook) {
              try {
                await retryFetch(teamsWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) }, 2, 100);
              } catch (err: unknown) {
                console.error('Teams notify failed', err);
              }
            }
          } catch (e) {
            console.error("HubSpot association/notify failed", e);
          }
        }
      } else {
        // If no token, enqueue a hubspot sync record for worker to process
        try {
          await supabase.from("hubspot_sync_queue").insert([
            { type: "dispute", payload: { dispute_id: dispute.id, milestone_id: milestoneId } },
          ]);
        } catch {
          // ignore enqueue errors
        }
      }
    } catch (e) {
      console.error("HubSpot ticket creation failed", e);
    }

    // return dispute and any created hubspot ticket id to caller for tracing
    // attempt to reload dispute to include persisted hubspot_ticket_id
    try {
      const { data: reloaded } = await supabase.from('disputes').select('*').eq('id', dispute.id).single();
      return NextResponse.json(reloaded ?? dispute);
    } catch {
      return NextResponse.json(dispute);
    }
  } catch (error) {
    console.error("Dispute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
