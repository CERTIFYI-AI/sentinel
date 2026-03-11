import asyncio, logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

async def run_policy_review_reminders(db_pool):
    logger.info('Running policy review reminders...')
    async with db_pool.acquire() as db:
        tenants = await db.fetch('SELECT tenant_id FROM policy_notification_settings')
        for tenant_row in tenants:
            tenant_id = tenant_row['tenant_id']
            try:
                settings = await db.fetchrow('SELECT * FROM policy_notification_settings WHERE tenant_id=', tenant_id)
                if not settings: continue
                today = date.today()
                rr = settings['review_reminder']
                should_remind = False
                if rr == 'WEEKLY' and today.weekday() == (settings['reminder_day_of_week'] - 1):
                    should_remind = True
                elif rr == 'MONTHLY' and today.day == settings['reminder_day_of_month']:
                    should_remind = True
                elif rr == 'AS_NEEDED':
                    should_remind = True
                if not should_remind: continue
                due_policies = await db.fetch('SELECT * FROM v_policies_due_review WHERE tenant_id=', tenant_id)
                for policy in due_policies:
                    try:
                        days_overdue = policy['days_overdue'] or 0
                        await db.execute(
                            """INSERT INTO notifications(tenant_id, type, title, body, metadata, created_at)
                               VALUES(,,,,,NOW())
                               ON CONFLICT DO NOTHING""",
                            tenant_id, 'POLICY_REVIEW_DUE',
                            f"Policy Review Due: {policy['title']}",
                            f"Policy '{policy['title']}' (v{policy['version']}) is {'overdue by ' + str(days_overdue) + ' days' if days_overdue > 0 else 'due for review'}.",
                            '{}')
                        await db.execute(
                            "INSERT INTO policy_activity_log(tenant_id,policy_id,actor_id,action,detail) VALUES(,,,,)",
                            tenant_id, str(policy['id']), 'system', 'REVIEW_REMINDER_SENT',
                            '{}')
                        logger.info(f'Reminder sent for policy {policy["id"]} in tenant {tenant_id}')
                    except Exception as e:
                        logger.error(f'Error processing policy {policy.get("id")}: {e}')
            except Exception as e:
                logger.error(f'Error processing tenant {tenant_id}: {e}')

async def run_daily_at(hour: int, func, **kwargs):
    while True:
        now = datetime.utcnow()
        next_run = now.replace(hour=hour, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run = next_run.replace(day=next_run.day + 1)
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)
        try:
            await func(**kwargs)
        except Exception as e:
            logger.error(f'Error in scheduled task: {e}')
