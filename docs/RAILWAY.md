# Railway deployment

The app needs a web service and a separate PostgreSQL service in the same Railway project. A successful web build does not create the database. The startup command now applies the repository migrations before accepting requests; it preserves existing records and does not seed demo accounts.

## Connect the missing database

1. In the Railway project, choose **New → Database → PostgreSQL**.
2. Open the **sahai** web service and its **Variables** tab.
3. Add `DATABASE_URL` as a reference to the Postgres service's `DATABASE_URL`. With the default service name, the value is `${{Postgres.DATABASE_URL}}`. This is a reference, not a password to copy into chat.
4. Add a private `SETUP_TOKEN` of at least 32 characters. It is used once on **Initial CEO setup**; do not commit or share it.
5. Deploy the variable changes. After the new code is built, startup will create/update the tables automatically. Do not point this service at the localhost database from `.env.example`.

The public domain already generated for the service provides `RAILWAY_PUBLIC_DOMAIN`. The app uses it as the canonical HTTPS origin if `APP_URL` is unset. For a custom domain, explicitly set `APP_URL` to that full HTTPS origin. Secure cookies follow the HTTPS origin. Remove any local `SESSION_COOKIE_SECURE=false` override from a hosted service.

## Build and start

Railway's supported `railpack.json` deployment configuration selects `npm start`. The start wrapper runs `prisma migrate deploy` and starts Next.js only when migration succeeds. Prisma and tsx are runtime dependencies so production dependency pruning retains the migration CLI and optional worker. The service honors Railway's `PORT` automatically.

Use `/api/health` as the healthcheck path. It reports success only after the database connection and core schema are available. Failure responses do not expose credentials or internal database details.

No `railway.json` is required. Current Railway documentation deprecates that legacy configuration format for new services; the Railpack configuration is supported independently.

## File persistence and scheduled follow-ups

Attach a persistent Railway volume to the web service, for example at `/data`. The app automatically stores evidence under `RAILWAY_VOLUME_MOUNT_PATH/evidence`. Alternatively, set `EVIDENCE_DIR` to a persistent mounted directory. Without a volume, uploaded files can disappear when a deployment container is replaced. Existing local evidence is not automatically copied to Railway; migrate it deliberately if needed.

For automatic follow-ups, add a second service from the same repository, attach the same database reference, and override its start command to `npm run worker`. It does not need a public domain or an evidence volume. Start it after the web migration succeeds. Scheduling is persistent and notifications remain clearly labeled simulation; no external employee messages are sent.

## Initial CEO account

Open the generated site, select **Initial CEO setup**, and use the private `SETUP_TOKEN` from Railway Variables with your chosen account details. Setup is closed after the first CEO account is created. Cloud development demo credentials are not deployed to Railway.

The local development database, local access file, and database snapshot are ignored by Git and never uploaded with the application source. Live Railway account configuration and database state must be verified through authenticated Railway access; code changes alone do not prove a successful deployment.
