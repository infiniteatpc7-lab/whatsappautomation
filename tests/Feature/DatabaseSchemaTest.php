<?php

namespace Tests\Feature;

use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspacePlan;
use App\Models\AiAgent;
use App\Models\AiKnowledgeSource;
use App\Models\AutomationFlow;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use App\Models\Message;
use App\Models\Template;
use App\Models\User;
use App\Models\WebhookLog;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Database\Seeders\DemoWorkspaceSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_17_tables_exist_and_demo_workspace_seeder_runs_cleanly(): void
    {
        $tables = [
            'users',
            'workspaces',
            'workspace_user',
            'whatsapp_accounts',
            'contacts',
            'tags',
            'contact_tag',
            'templates',
            'campaigns',
            'campaign_recipients',
            'conversations',
            'messages',
            'conversation_notes',
            'kanban_boards',
            'kanban_columns',
            'kanban_cards',
            'automation_flows',
            'ai_agents',
            'ai_knowledge_sources',
            'webhook_logs',
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Table {$table} should exist in schema.");
        }

        $this->seed(DemoWorkspaceSeeder::class);

        $this->assertDatabaseHas('users', ['email' => 'admin@whatsappautomation.test']);
        $this->assertDatabaseHas('workspaces', ['slug' => 'stpl-industrial-lasers']);
        $this->assertDatabaseHas('whatsapp_accounts', ['phone_number_id' => '200000000000001']);
        $this->assertDatabaseCount('contacts', 10);
        $this->assertDatabaseCount('tags', 3);
        $this->assertDatabaseCount('templates', 1);
        $this->assertDatabaseCount('conversations', 3);
        $this->assertDatabaseCount('kanban_boards', 1);
        $this->assertDatabaseCount('kanban_columns', 4);
        $this->assertDatabaseCount('kanban_cards', 4);
        $this->assertDatabaseCount('ai_agents', 1);
        $this->assertDatabaseCount('ai_knowledge_sources', 1);
    }

    public function test_whatsapp_account_links_cleanly_and_encrypts_tokens(): void
    {
        $workspace = Workspace::create([
            'name' => 'Test WS',
            'slug' => 'test-ws',
            'owner_id' => User::factory()->create()->id,
            'plan' => WorkspacePlan::PRO,
        ]);

        $plainToken = 'secret-meta-access-token-999';

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_123',
            'phone_number_id' => 'phone_123',
            'display_phone_number' => '+91 98765 43210',
            'verified_name' => 'Test Business',
            'access_token' => $plainToken,
            'app_secret' => 'super-secret-app-secret',
            'webhook_verify_token' => 'wh_verify_xyz',
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);

        $this->assertEquals('whatsapp_accounts', $account->getTable());

        // Check raw DB stores encrypted token
        $rawToken = DB::table('whatsapp_accounts')->where('id', $account->id)->value('access_token');
        $this->assertNotEquals($plainToken, $rawToken);
        $this->assertEquals($plainToken, $account->fresh()->access_token);

        // Check hidden attributes
        $array = $account->toArray();
        $this->assertArrayNotHasKey('access_token', $array);
        $this->assertArrayNotHasKey('app_secret', $array);
        $this->assertArrayNotHasKey('webhook_verify_token', $array);

        // Check relationships link via whatsapp_account_id
        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'name' => 'sample_template',
            'language' => 'en',
            'category' => TemplateCategory::UTILITY,
            'status' => TemplateStatus::APPROVED,
            'components' => [],
        ]);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Test Contact',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
        ]);

        $message = Message::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'type' => MessageType::TEXT,
            'body' => 'Hello',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'template_id' => $template->id,
            'name' => 'Test Campaign',
        ]);

        $flow = AutomationFlow::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'name' => 'Test Flow',
            'trigger_type' => 'keyword',
        ]);

        $this->assertTrue($account->templates->contains($template));
        $this->assertTrue($account->conversations->contains($conversation));
        $this->assertTrue($account->messages->contains($message));
        $this->assertTrue($account->campaigns->contains($campaign));
        $this->assertTrue($account->automationFlows->contains($flow));

        $this->assertEquals($account->id, $template->whatsappAccount->id);
        $this->assertEquals($account->id, $conversation->whatsappAccount->id);
        $this->assertEquals($account->id, $message->whatsappAccount->id);
        $this->assertEquals($account->id, $campaign->whatsappAccount->id);
        $this->assertEquals($account->id, $flow->whatsappAccount->id);
    }

    public function test_unique_constraints_enforce_database_integrity(): void
    {
        $workspace = Workspace::create([
            'name' => 'Integrity WS',
            'slug' => 'integrity-ws',
            'owner_id' => User::factory()->create()->id,
            'plan' => WorkspacePlan::FREE,
        ]);

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_u',
            'phone_number_id' => 'phone_u',
            'display_phone_number' => '+91 99999 00000',
            'access_token' => 'dummy',
            'webhook_verify_token' => 'dummy',
        ]);

        // Duplicate (workspace_id, wa_id) on contacts
        Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919727509785',
            'name' => 'Original',
        ]);

        $this->expectException(QueryException::class);
        Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919727509785',
            'name' => 'Duplicate',
        ]);
    }

    public function test_duplicate_wamid_throws_query_exception(): void
    {
        $workspace = Workspace::create([
            'name' => 'Wamid WS',
            'slug' => 'wamid-ws',
            'owner_id' => User::factory()->create()->id,
            'plan' => WorkspacePlan::FREE,
        ]);

        $account = WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_w',
            'phone_number_id' => 'phone_w',
            'display_phone_number' => '+91 99999 00001',
            'access_token' => 'dummy',
            'webhook_verify_token' => 'dummy',
        ]);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919999900001',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
        ]);

        Message::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'wamid' => 'wamid.HBgLTESTUNIQUE12345',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'First message',
        ]);

        $this->expectException(QueryException::class);
        Message::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'wamid' => 'wamid.HBgLTESTUNIQUE12345',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'Second message duplicate',
        ]);
    }

    public function test_conversation_24h_window_logic(): void
    {
        $convOpen = new Conversation([
            'window_expires_at' => now()->addHours(10),
        ]);
        $this->assertTrue($convOpen->isWindowOpen());

        $convExpired = new Conversation([
            'window_expires_at' => now()->subHour(),
        ]);
        $this->assertFalse($convExpired->isWindowOpen());

        $convNull = new Conversation([
            'window_expires_at' => null,
        ]);
        $this->assertFalse($convNull->isWindowOpen());
    }

    public function test_contact_phone_normalization(): void
    {
        $normalized = Contact::normalizeWaId('+91 97275-09785');
        $this->assertEquals('919727509785', $normalized);
    }

    public function test_message_status_rank_ordering(): void
    {
        $this->assertGreaterThan(MessageStatus::DELIVERED->rank(), MessageStatus::READ->rank());
        $this->assertGreaterThan(MessageStatus::SENT->rank(), MessageStatus::DELIVERED->rank());
        $this->assertGreaterThan(MessageStatus::QUEUED->rank(), MessageStatus::SENT->rank());
        $this->assertGreaterThan(MessageStatus::READ->rank(), MessageStatus::FAILED->rank());
    }

    public function test_webhook_log_inserts_without_updated_at_and_prunable(): void
    {
        $logOld = WebhookLog::create([
            'phone_number_id' => '12345',
            'event_type' => 'messages',
            'payload' => ['sample' => 'data'],
            'created_at' => now()->subDays(15),
        ]);

        $logRecent = WebhookLog::create([
            'phone_number_id' => '12345',
            'event_type' => 'messages',
            'payload' => ['sample' => 'data'],
            'created_at' => now()->subDays(5),
        ]);

        $this->assertNull($logRecent->updated_at);

        $prunableIds = (new WebhookLog)->prunable()->pluck('id')->all();
        $this->assertContains($logOld->id, $prunableIds);
        $this->assertNotContains($logRecent->id, $prunableIds);
    }

    public function test_kanban_and_ai_relationships(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::create([
            'name' => 'Kanban WS',
            'slug' => 'kanban-ws',
            'owner_id' => $user->id,
            'plan' => WorkspacePlan::GROWTH,
        ]);

        $board = KanbanBoard::create([
            'workspace_id' => $workspace->id,
            'name' => 'Deals',
        ]);

        $col = KanbanColumn::create([
            'board_id' => $board->id,
            'title' => 'Prospect',
            'position' => 0,
        ]);

        $card = KanbanCard::create([
            'workspace_id' => $workspace->id,
            'board_id' => $board->id,
            'column_id' => $col->id,
            'assigned_to' => $user->id,
            'title' => 'Big Deal',
            'deal_value' => 50000.00,
            'position' => 0,
        ]);

        $this->assertTrue($board->columns->contains($col));
        $this->assertTrue($col->cards->contains($card));
        $this->assertEquals($user->id, $card->assignee->id);

        $aiAgent = AiAgent::create([
            'workspace_id' => $workspace->id,
            'name' => 'Support Bot',
            'system_prompt' => 'Help customers',
        ]);

        $source = AiKnowledgeSource::create([
            'workspace_id' => $workspace->id,
            'ai_agent_id' => $aiAgent->id,
            'type' => 'text',
            'title' => 'FAQ',
            'extracted_text' => 'Frequently asked questions',
        ]);

        $this->assertTrue($aiAgent->knowledgeSources->contains($source));
        $this->assertEquals($aiAgent->id, $source->aiAgent->id);
    }
}
