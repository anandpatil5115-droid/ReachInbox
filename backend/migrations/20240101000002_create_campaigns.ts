import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('campaigns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('subject', 500).notNullable();
    table.text('body').notNullable();
    table.string('sender_email', 255).notNullable();
    table.timestamp('start_at', { useTz: true }).notNullable();
    table.integer('delay_seconds').defaultTo(2);
    table.integer('hourly_limit').defaultTo(200);
    table.integer('total_recipients').defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index('user_id', 'campaigns_user_id_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('campaigns');
}
