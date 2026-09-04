import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('email_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('campaign_id').notNullable().references('id').inTable('campaigns').onDelete('CASCADE');
    table.string('recipient', 255).notNullable();
    table.string('subject', 500).notNullable();
    table.text('body').notNullable();
    table.string('sender_email', 255).notNullable();
    table.integer('hourly_limit').defaultTo(200);
    table.timestamp('scheduled_at', { useTz: true }).notNullable();
    table.timestamp('sent_at', { useTz: true }).nullable();
    table.string('status', 20).defaultTo('pending');
    table.text('last_error').nullable();
    table.string('provider_message_id', 255).nullable();
    table.string('bullmq_job_id', 255).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('user_id', 'email_messages_user_id_idx');
    table.index('campaign_id', 'email_messages_campaign_id_idx');
    table.index('status', 'email_messages_status_idx');
    table.index('scheduled_at', 'email_messages_scheduled_at_idx');
    table.index('recipient', 'email_messages_recipient_idx');
    table.index('sender_email', 'email_messages_sender_email_idx');
    table.unique(['campaign_id', 'recipient'], { indexName: 'email_messages_campaign_recipient_unique' });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_messages');
}
