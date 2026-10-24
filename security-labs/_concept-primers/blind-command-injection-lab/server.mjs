import express from "express";
import { exec } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const PORT = 4321;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTIFY_SCRIPT = path.join(__dirname, "scripts", "notify-subscriber.sh");

const FORM = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Feedback</title>
  </head>
  <body>
    <h1>Contact us</h1>
    <form method="post" action="/">
      <label>Name <input name="name" required></label><br>
      <label>Email <input name="email" type="text" required></label><br>
      <label>Message <textarea name="message" required></textarea></label><br>
      <button type="submit">Send feedback</button>
    </form>
    <p>Submitting feedback queues an async subscriber-notification job.
    The HTTP response never carries that job's output — this endpoint is blind.</p>
  </body>
</html>`;

export function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get("/", (_request, response) => {
    response.type("html").send(FORM);
  });

  app.post("/", (request, response) => {
    const { email } = request.body;

    // Respond immediately. Whatever happens below is fire-and-forget from the
    // client's point of view — the HTTP response carries no trace of it.
    response.status(200).type("text").send("Thank you for your feedback.");

    setImmediate(() => {
      // Vulnerable by design: the email value is interpolated directly into a
      // shell command line with no quoting and no sanitization, then handed to
      // a real shell (child_process.exec spawns via /bin/sh -c). Anything the
      // shell will parse out of this string, it will execute.
      const command = `${NOTIFY_SCRIPT} ${email}`;
      exec(command, { timeout: 5000 }, (error, _stdout, stderr) => {
        // Only ever logged server-side — never returned to the HTTP client.
        if (error) console.error(`[notify] dispatch failed: ${error.message}`);
        if (stderr) console.error(`[notify] stderr: ${stderr.trim()}`);
      });
    });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, "127.0.0.1", () => {
    console.log(`Vulnerable feedback simulator listening at http://127.0.0.1:${PORT}`);
    console.log("Loopback only. Do not expose this process to any network.");
  });
}
