import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // optional: replace with your custom login page if needed
  },
});

export const config = {
  matcher: ["/dashboard"],
};
