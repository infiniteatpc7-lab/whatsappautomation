<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithUser(string $name, string $email): array
    {
        $user = User::create([
            'name' => "User {$name}",
            'email' => $email,
            'password' => bcrypt('Secret1234!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $workspace = Workspace::create([
            'owner_id' => $user->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => WorkspaceRole::OWNER->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        return [$workspace, $user];
    }

    protected function createAccount(Workspace $workspace): WhatsAppAccount
    {
        return WhatsAppAccount::create([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_'.Str::random(10),
            'phone_number_id' => 'phone_'.Str::random(10),
            'display_phone_number' => '+916357590920',
            'verified_name' => 'Acme Laser',
            'access_token' => 'EAAG_test_access_token_mock',
            'webhook_verify_token' => 'test_webhook_verify_token_123',
            'status' => WhatsAppAccountStatus::CONNECTED,
        ]);
    }

    public function test_user_can_view_chat_inbox_with_conversations(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Alpha Org', 'owner_chat@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Rahul Sharma',
            'source' => 'inbound_wa',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
            'last_message_preview' => 'Hello team',
            'window_expires_at' => now()->addHours(24),
        ]);

        $response = $this->actingAs($user)->get('/dashboard/chat');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Chat/Index')
            ->has('initialConversations', 1)
            ->where('initialConversations.0.name', 'Rahul Sharma')
            ->where('hasConnectedAccount', true)
        );
    }

    public function test_user_can_fetch_messages_for_a_conversation(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Beta Org', 'beta_chat@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Pooja Patel',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
            'window_expires_at' => now()->addHours(24),
        ]);

        Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conversation->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid_12345',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'Inquiry about cutting laser',
            'status' => MessageStatus::DELIVERED,
        ]);

        $response = $this->actingAs($user)->getJson("/dashboard/chat/conversations/{$conversation->id}/messages");
        $response->assertOk();
        $response->assertJsonStructure([
            'conversation_id',
            'is_window_open',
            'messages' => [
                '*' => ['id', 'wamid', 'sender', 'author', 'text', 'type', 'status', 'timestamp'],
            ],
        ]);
        $response->assertJsonFragment([
            'text' => 'Inquiry about cutting laser',
            'sender' => 'contact',
        ]);
    }

    public function test_user_cannot_access_other_workspace_conversation_messages(): void
    {
        [$workspaceA, $userA] = $this->createWorkspaceWithUser('Org A', 'user_a@example.com');
        [$workspaceB, $userB] = $this->createWorkspaceWithUser('Org B', 'user_b@example.com');

        $accountA = $this->createAccount($workspaceA);

        $contactA = Contact::create([
            'workspace_id' => $workspaceA->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Secret Customer',
        ]);

        $conversationA = Conversation::create([
            'workspace_id' => $workspaceA->id,
            'whatsapp_account_id' => $accountA->id,
            'contact_id' => $contactA->id,
            'status' => ConversationStatus::OPEN,
        ]);

        $this->actingAs($userB)
            ->getJson("/dashboard/chat/conversations/{$conversationA->id}/messages")
            ->assertForbidden();
    }

    public function test_user_can_send_outbound_whatsapp_message_within_24h_window(): void
    {
        Http::fake([
            'https://graph.facebook.com/*' => Http::response([
                'messaging_product' => 'whatsapp',
                'contacts' => [['input' => '919876543210', 'wa_id' => '919876543210']],
                'messages' => [['id' => 'wamid.HBgLMTEyMjMzNDQ1NQ==']],
            ], 200),
        ]);

        [$workspace, $user] = $this->createWorkspaceWithUser('Gamma Org', 'gamma_chat@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Live Customer',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
            'window_expires_at' => now()->addHours(12),
        ]);

        $response = $this->actingAs($user)->postJson("/dashboard/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Thank you for your interest! Our catalog is attached.',
        ]);

        $response->assertCreated();
        $response->assertJsonFragment([
            'wamid' => 'wamid.HBgLMTEyMjMzNDQ1NQ==',
            'sender' => 'user',
            'author' => 'You',
            'text' => 'Thank you for your interest! Our catalog is attached.',
        ]);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'wamid' => 'wamid.HBgLMTEyMjMzNDQ1NQ==',
            'direction' => 'outbound',
            'body' => 'Thank you for your interest! Our catalog is attached.',
        ]);

        $conversation->refresh();
        $this->assertEquals('Thank you for your interest! Our catalog is attached.', $conversation->last_message_preview);
    }

    public function test_outbound_message_fails_when_24h_window_is_closed(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Delta Org', 'delta_chat@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Expired Customer',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
            'window_expires_at' => now()->subHour(), // Expired
        ]);

        $response = $this->actingAs($user)->postJson("/dashboard/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Hello, are you still interested?',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['body']);
    }

    public function test_user_can_start_new_conversation(): void
    {
        Http::fake([
            'https://graph.facebook.com/*' => Http::response([
                'messaging_product' => 'whatsapp',
                'contacts' => [['input' => '919999988888', 'wa_id' => '919999988888']],
                'messages' => [['id' => 'wamid.NEW_CONV_123']],
            ], 200),
        ]);

        [$workspace, $user] = $this->createWorkspaceWithUser('Epsilon Org', 'epsilon_chat@example.com');
        $account = $this->createAccount($workspace);

        $response = $this->actingAs($user)->postJson('/dashboard/chat/conversations/start', [
            'phone' => '+91 99999 88888',
            'name' => 'New Lead Customer',
            'message' => 'Hello from STPL Laser Support!',
        ]);

        $response->assertCreated();
        $response->assertJsonStructure([
            'conversation' => ['id', 'name', 'phone'],
            'message' => ['id', 'wamid', 'text', 'sender'],
        ]);

        $this->assertDatabaseHas('contacts', [
            'workspace_id' => $workspace->id,
            'wa_id' => '919999988888',
            'profile_name' => 'New Lead Customer',
        ]);

        $this->assertDatabaseHas('messages', [
            'wamid' => 'wamid.NEW_CONV_123',
            'body' => 'Hello from STPL Laser Support!',
        ]);
    }

    public function test_user_can_start_new_conversation_without_message(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Eta Org', 'eta_chat@example.com');
        $account = $this->createAccount($workspace);

        $response = $this->actingAs($user)->postJson('/dashboard/chat/conversations/start', [
            'phone' => '+91 88888 77777',
            'name' => 'Future Lead Contact',
        ]);

        $response->assertCreated();
        $response->assertJsonStructure([
            'conversation' => ['id', 'name', 'phone'],
        ]);
        $this->assertNull($response->json('message'));

        $this->assertDatabaseHas('contacts', [
            'workspace_id' => $workspace->id,
            'wa_id' => '918888877777',
            'profile_name' => 'Future Lead Contact',
        ]);

        $this->assertDatabaseHas('conversations', [
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
        ]);
    }

    public function test_user_can_mark_conversation_as_read(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser('Zeta Org', 'zeta_chat@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'profile_name' => 'Mark Read Customer',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'unread_count' => 5,
        ]);

        $response = $this->actingAs($user)->postJson("/dashboard/chat/conversations/{$conversation->id}/read");
        $response->assertOk();

        $conversation->refresh();
        $this->assertEquals(0, $conversation->unread_count);
    }
}
