(async () => {
  try {
    const mod = await import('../src/app/api/internal/health/route');
    const res = await mod.GET();
    // NextResponse.json returns a Response-like object; try to extract JSON
    if (res && typeof res.json === 'function') {
      const body = await res.json();
      console.log('body:', JSON.stringify(body, null, 2));
    } else {
      console.log('res:', res);
    }
  } catch (e) {
    console.error('error running handler', e);
    process.exitCode = 1;
  }
})();
