// Simple smoke test for API connectivity
// Usage: VITE_API_BASE_URL=https://smart-teeth-care.runasp.net AUTH_TOKEN=token node ./scripts/smokeTest.js

const base =
  process.env.VITE_API_BASE_URL || "https://smart-teeth-care.runasp.net";
const auth = process.env.AUTH_TOKEN || null;

async function run() {
  console.log("Smoke test base URL:", base);
  try {
    const headers = { Accept: "application/json" };
    if (auth) headers["Authorization"] = `Bearer ${auth}`;

    const swaggerUrl = `${base.replace(/\/$/, "")}/swagger/v1/swagger.json`;
    console.log("Fetching Swagger JSON:", swaggerUrl);
    const sw = await fetch(swaggerUrl, { headers });
    console.log("Swagger status:", sw.status);
    if (sw.ok) {
      const json = await sw.json();
      console.log(
        "Swagger title:",
        json.info && json.info.title,
        "version:",
        json.info && json.info.version,
      );
    } else {
      console.error("Failed to fetch swagger.json");
    }

    // Try a protected endpoint if token provided
    if (auth) {
      const myAppts = await fetch(
        `${base.replace(/\/$/, "")}/api/PatientAppointment/GetMyAppointments`,
        { headers },
      );
      console.log(
        "/api/PatientAppointment/GetMyAppointments status:",
        myAppts.status,
      );
      if (myAppts.ok) {
        const data = await myAppts.json();
        console.log(
          "My appointments count:",
          Array.isArray(data) ? data.length : "unknown",
        );
      } else {
        console.error("Protected endpoint returned", myAppts.status);
      }
    } else {
      console.log("No AUTH_TOKEN provided — skipped protected endpoint test.");
    }

    console.log("Smoke test completed");
  } catch (e) {
    console.error("Smoke test error:", e.message || e);
    process.exitCode = 2;
  }
}

run();
