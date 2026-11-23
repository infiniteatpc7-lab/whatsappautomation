<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CampaignStatus;
use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\RecipientStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspaceRole;
use App\Jobs\DownloadWhatsAppMediaJob;
use App\Jobs\ProcessWhatsAppWebhookJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Template;
use App\Models\User;
use App\Models\WebhookLog;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use App\Services\WhatsApp\MetaCloudClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class WhatsAppConnectionAndWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithUser(string $name, string $email, WorkspaceRole $role = WorkspaceRole::OWNER): array
    {
        $user = User::create([
            'name' => "User {$name}",
            'email' => $email,
            'password' => bcrypt('Secret1234!'),
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();

        $ownerId = $role === WorkspaceRole::OWNER ? $user->id : User::create([
            'name' => "Owner for {$name}",
            'email' => 'owner_for_'.Str::random(8).'@example.com',
            'password' => bcrypt('Secret1234!'),
        ])->id;

        $workspace = Workspace::create([
            'owner_id' => $ownerId,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(6),
            'timezone' => 'Asia/Kolkata',
        ]);

        $workspace->users()->attach($user->id, [
            'role' => $role->value,
            'is_available' => true,
        ]);

        $user->forceFill(['current_workspace_id' => $workspace->id])->save();

        return [$workspace, $user];
    }

    protected function createAccount(Workspace $workspace, array $overrides = []): WhatsAppAccount
    {
        return WhatsAppAccount::create(array_merge([
            'workspace_id' => $workspace->id,
            'connection_type' => WhatsAppConnectionType::MANUAL,
            'waba_id' => 'waba_'.Str::random(10),
            'phone_number_id' => 'phone_'.Str::random(10),
            'display_phone_number' => '+15551234567',
            'verified_name' => 'Acme Test Corp',
            'access_token' => 'EAAG_test_access_token_string_here_12345',
            'app_secret' => 'test_app_secret_abc123',
            'webhook_verify_token' => 'test_verify_token_12345',
            'status' => WhatsAppAccountStatus::CONNECTED,
        ], $overrides));
    }

    // 1. Account CRUD & Permissions
    public function test_owner_can_list_and_create_whatsapp_account(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Alpha Org', 'owner_alpha@example.com');

        $account = $this->createAccount($workspace, [
            'phone_number_id' => 'phone_alpha_1',
            'access_token' => 'super_secret_token_value_123',
        ]);

        // List accounts
        $response = $this->actingAs($owner)
            ->getJson('/dashboard/whatsapp-accounts')
            ->assertOk();

        $response->assertJsonFragment([
            'phone_number_id' => 'phone_alpha_1',
            'has_access_token' => true,
            'has_app_secret' => true,
        ]);

        // Ensure raw secrets are NEVER returned in JSON
        $json = $response->json();
        $this->assertArrayNotHasKey('access_token', $json[0]);
        $this->assertArrayNotHasKey('app_secret', $json[0]);
        $this->assertArrayNotHasKey('webhook_verify_token', $json[0]);

        // Create new account
        $createRes = $this->actingAs($owner)
            ->postJson('/dashboard/whatsapp-accounts', [
                'waba_id' => 'waba_new_999',
                'phone_number_id' => 'phone_new_999',
                'display_phone_number' => '+15559876543',
                'access_token' => 'EAAG_new_valid_token_string_here',
                'app_secret' => 'secret_999',
            ]);

        $createRes->assertCreated();
        $this->assertDatabaseHas('whatsapp_accounts', [
            'phone_number_id' => 'phone_new_999',
            'workspace_id' => $workspace->id,
        ]);
    }

    public function test_agent_role_is_forbidden_from_managing_whatsapp_accounts(): void
    {
        [$workspace, $agent] = $this->createWorkspaceWithUser('Beta Org', 'agent_beta@example.com', WorkspaceRole::AGENT);
        $account = $this->createAccount($workspace);

        $this->actingAs($agent)
            ->postJson('/dashboard/whatsapp-accounts', [
                'waba_id' => 'waba_fail',
                'phone_number_id' => 'phone_fail',
                'display_phone_number' => '+15550000000',
                'access_token' => 'EAAG_some_token_here_12345',
            ])
            ->assertForbidden();

        $this->actingAs($agent)
            ->patchJson("/dashboard/whatsapp-accounts/{$account->id}", [
                'display_phone_number' => '+15551111111',
            ])
            ->assertForbidden();

        $this->actingAs($agent)
            ->deleteJson("/dashboard/whatsapp-accounts/{$account->id}")
            ->assertForbidden();
    }

    public function test_workspace_isolation_prevents_cross_tenant_access(): void
    {
        [$wsA, $ownerA] = $this->createWorkspaceWithUser('Org A', 'ownerA@org.com');
        [$wsB, $ownerB] = $this->createWorkspaceWithUser('Org B', 'ownerB@org.com');

        $accountB = $this->createAccount($wsB);

        // Owner A cannot update or delete Owner B's WhatsApp account
        $this->actingAs($ownerA)
            ->patchJson("/dashboard/whatsapp-accounts/{$accountB->id}", [
                'display_phone_number' => '+19999999999',
            ])
            ->assertForbidden();

        $this->actingAs($ownerA)
            ->deleteJson("/dashboard/whatsapp-accounts/{$accountB->id}")
            ->assertForbidden();

        $this->actingAs($ownerA)
            ->postJson("/dashboard/whatsapp-accounts/{$accountB->id}/test")
            ->assertForbidden();
    }

    public function test_account_test_endpoint_syncs_meta_details_on_success(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Test Org', 'owner_test@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => '104857600000001',
            'status' => WhatsAppAccountStatus::PENDING,
        ]);

        Http::fake([
            'https://graph.facebook.com/v22.0/104857600000001*' => Http::response([
                'id' => '104857600000001',
                'display_phone_number' => '+1 555-0100',
                'verified_name' => 'Acme Production Live',
                'quality_rating' => 'GREEN',
                'messaging_limit_tier' => 'TIER_10K',
            ], 200),
        ]);

        $response = $this->actingAs($owner)
            ->postJson("/dashboard/whatsapp-accounts/{$account->id}/test");

        $response->assertOk();
        $account->refresh();
        $this->assertEquals(WhatsAppAccountStatus::CONNECTED, $account->status);
        $this->assertEquals('Acme Production Live', $account->verified_name);
        $this->assertEquals('GREEN', $account->quality_rating);
        $this->assertEquals('TIER_10K', $account->messaging_limit_tier);
    }

    public function test_account_test_endpoint_handles_meta_failure_gracefully(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Fail Org', 'owner_fail@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => '104857600000002',
        ]);

        Http::fake([
            'https://graph.facebook.com/v22.0/104857600000002*' => Http::response([
                'error' => [
                    'message' => 'Invalid OAuth access token.',
                    'type' => 'OAuthException',
                    'code' => 190,
                    'fbtrace_id' => 'AY12345678',
                ],
            ], 400),
        ]);

        $response = $this->actingAs($owner)
            ->postJson("/dashboard/whatsapp-accounts/{$account->id}/test");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Failed to connect to Meta WhatsApp Cloud API.']);

        $account->refresh();
        $this->assertEquals(WhatsAppAccountStatus::ERROR, $account->status);
    }

    // 2. Webhook Verification (GET)
    public function test_webhook_get_verification_handshake(): void
    {
        config(['services.meta.webhook_verify_token' => 'global_secret_token_12345']);

        // Success with global token
        $response = $this->get('/api/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=global_secret_token_12345&hub_challenge=1158201444');
        $response->assertOk()
            ->assertSee('1158201444');

        // Success with per-account token
        [$workspace, $owner] = $this->createWorkspaceWithUser('WS Hook', 'hook@example.com');
        $account = $this->createAccount($workspace, ['webhook_verify_token' => 'unique_account_verify_token_999']);

        $resAcct = $this->get('/api/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=unique_account_verify_token_999&hub_challenge=99887766');
        $resAcct->assertOk()
            ->assertSee('99887766');

        // Rejects invalid token
        $this->get('/api/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=wrong_token&hub_challenge=12345')
            ->assertForbidden();
    }

    // 3. Webhook Signature Verification (POST)
    public function test_webhook_post_requires_valid_meta_signature(): void
    {
        Queue::fake();

        [$workspace, $owner] = $this->createWorkspaceWithUser('Sig WS', 'sig@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => 'phone_sig_123',
            'app_secret' => 'super_secret_app_key_321',
        ]);

        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [
                [
                    'id' => 'waba_123',
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'messaging_product' => 'whatsapp',
                                'metadata' => [
                                    'display_phone_number' => '15551234567',
                                    'phone_number_id' => 'phone_sig_123',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $jsonBody = json_encode($payload);
        $signature = 'sha256='.hash_hmac('sha256', $jsonBody, 'super_secret_app_key_321');

        // Missing signature -> 403
        $this->call('POST', '/api/webhooks/whatsapp', [], [], [], [], $jsonBody)
            ->assertForbidden();

        // Invalid signature -> 403
        $this->call('POST', '/api/webhooks/whatsapp', [], [], [], [
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256=invalidhash',
        ], $jsonBody)->assertForbidden();

        // Valid signature -> 200
        $response = $this->call('POST', '/api/webhooks/whatsapp', [], [], [], [
            'HTTP_X_HUB_SIGNATURE_256' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $jsonBody);

        $response->assertOk()->assertJson(['status' => 'received']);

        $this->assertDatabaseHas('webhook_logs', [
            'phone_number_id' => 'phone_sig_123',
            'workspace_id' => $workspace->id,
            'event_type' => 'unknown',
            'processed' => false,
        ]);

        Queue::assertPushedOn('webhooks', ProcessWhatsAppWebhookJob::class);
    }

    // 4. Inbound Message Processing & Idempotency
    public function test_inbound_text_message_ingestion_and_idempotency(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Inbound WS', 'inbound@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => 'phone_inbound_1',
        ]);

        $rawWamid = 'wamid.HBgLMTkxOTcyNzUwOTc4NRAAGBUIAAAA';

        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [
                [
                    'id' => 'waba_123',
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'messaging_product' => 'whatsapp',
                                'metadata' => [
                                    'display_phone_number' => '15551234567',
                                    'phone_number_id' => 'phone_inbound_1',
                                ],
                                'contacts' => [
                                    [
                                        'profile' => ['name' => 'Alice Customer'],
                                        'wa_id' => '919727509785',
                                    ],
                                ],
                                'messages' => [
                                    [
                                        'from' => '919727509785',
                                        'id' => $rawWamid,
                                        'timestamp' => '1732185600',
                                        'type' => 'text',
                                        'text' => ['body' => 'Hello, pricing details please!'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create([
            'workspace_id' => $workspace->id,
            'phone_number_id' => 'phone_inbound_1',
            'event_type' => 'message',
            'payload' => $payload,
            'processed' => false,
            'created_at' => now(),
        ]);

        // Process webhook job
        $job = new ProcessWhatsAppWebhookJob($log->id);
        $job->handle();

        $log->refresh();
        $this->assertTrue($log->processed);

        // Assert Contact created
        $contact = Contact::where('wa_id', '919727509785')->first();
        $this->assertNotNull($contact);
        $this->assertEquals('Alice Customer', $contact->profile_name);
        $this->assertEquals($workspace->id, $contact->workspace_id);

        // Assert Conversation created with 24-hour window
        $conversation = Conversation::where('contact_id', $contact->id)->first();
        $this->assertNotNull($conversation);
        $this->assertEquals(1, $conversation->unread_count);
        $this->assertTrue($conversation->isWindowOpen());
        $this->assertEquals('Hello, pricing details please!', $conversation->last_message_preview);

        // Assert Message created
        $message = Message::where('wamid', $rawWamid)->first();
        $this->assertNotNull($message);
        $this->assertEquals(MessageDirection::INBOUND, $message->direction);
        $this->assertEquals(MessageSenderType::CONTACT, $message->sender_type);
        $this->assertEquals(MessageType::TEXT, $message->type);
        $this->assertEquals('Hello, pricing details please!', $message->body);

        // Replaying same webhook must be idempotent (no duplicate message or unread count increase)
        $log2 = WebhookLog::create([
            'workspace_id' => $workspace->id,
            'phone_number_id' => 'phone_inbound_1',
            'event_type' => 'message',
            'payload' => $payload,
            'processed' => false,
            'created_at' => now(),
        ]);

        $job2 = new ProcessWhatsAppWebhookJob($log2->id);
        $job2->handle();

        $this->assertEquals(1, Message::where('wamid', $rawWamid)->count());
        $conversation->refresh();
        $this->assertEquals(1, $conversation->unread_count);
    }

    public function test_inbound_message_with_ctwa_referral_sets_free_entry(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('CTWA WS', 'ctwa@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => 'phone_ctwa_1',
        ]);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'metadata' => ['phone_number_id' => 'phone_ctwa_1'],
                                'messages' => [
                                    [
                                        'from' => '15557778888',
                                        'id' => 'wamid.CTWA123',
                                        'type' => 'text',
                                        'text' => ['body' => 'I saw your Instagram ad!'],
                                        'referral' => [
                                            'source_type' => 'ad',
                                            'source_id' => 'ad_987654321',
                                            'headline' => 'Special 50% Off Offer',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create([
            'workspace_id' => $workspace->id,
            'phone_number_id' => 'phone_ctwa_1',
            'payload' => $payload,
            'created_at' => now(),
        ]);

        (new ProcessWhatsAppWebhookJob($log->id))->handle();

        $conversation = Conversation::where('workspace_id', $workspace->id)->first();
        $this->assertNotNull($conversation);
        $this->assertTrue($conversation->isFreeEntryActive());
    }

    public function test_inbound_image_queues_media_download_job(): void
    {
        Queue::fake();

        [$workspace, $owner] = $this->createWorkspaceWithUser('Media WS', 'media@example.com');
        $account = $this->createAccount($workspace, [
            'phone_number_id' => 'phone_media_1',
        ]);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'metadata' => ['phone_number_id' => 'phone_media_1'],
                                'messages' => [
                                    [
                                        'from' => '15553334444',
                                        'id' => 'wamid.IMG999',
                                        'type' => 'image',
                                        'image' => [
                                            'id' => 'meta_media_file_id_123',
                                            'mime_type' => 'image/png',
                                            'caption' => 'Check this receipt',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create([
            'workspace_id' => $workspace->id,
            'phone_number_id' => 'phone_media_1',
            'payload' => $payload,
            'created_at' => now(),
        ]);

        (new ProcessWhatsAppWebhookJob($log->id))->handle();

        Queue::assertPushedOn('webhooks', DownloadWhatsAppMediaJob::class);

        $msg = Message::where('wamid', 'wamid.IMG999')->first();
        $this->assertNotNull($msg);
        $this->assertEquals('meta_media_file_id_123', $msg->media_meta_id);
    }

    public function test_download_whatsapp_media_job_persists_binary_file(): void
    {
        Storage::fake('local');

        [$workspace, $owner] = $this->createWorkspaceWithUser('Download WS', 'dl@example.com');
        $account = $this->createAccount($workspace);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '15552223333',
        ]);

        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
        ]);

        $message = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conversation->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid.DL123',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::IMAGE,
            'media_meta_id' => 'meta_img_999',
            'media_mime_type' => 'image/jpeg',
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
        ]);

        Http::fake([
            'https://graph.facebook.com/v22.0/meta_img_999' => Http::response([
                'url' => 'https://lookaside.fbsbx.com/whatsapp_business/attachments/img_999.jpg',
                'mime_type' => 'image/jpeg',
                'file_size' => 1024,
            ], 200),
            'https://lookaside.fbsbx.com/*' => Http::response('FAKE_IMAGE_BINARY_CONTENT', 200),
        ]);

        $job = new DownloadWhatsAppMediaJob($message->id);
        $job->handle(new MetaCloudClient);

        $message->refresh();
        $this->assertNotNull($message->media_path);
        $this->assertStringEndsWith('.jpg', $message->media_path);
        Storage::disk('local')->assertExists($message->media_path);
    }

    // 5. Status Webhooks & Out-of-Order Rank Protection
    public function test_status_updates_advance_cleanly_and_prevent_out_of_order_downgrade(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Status WS', 'status@example.com');
        $account = $this->createAccount($workspace, ['phone_number_id' => 'phone_status_1']);

        $contact = Contact::create(['workspace_id' => $workspace->id, 'wa_id' => '15551112222']);
        $conversation = Conversation::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'contact_id' => $contact->id,
            'status' => ConversationStatus::OPEN,
        ]);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'tpl_status_test',
            'name' => 'flash_sale',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::APPROVED,
            'body_text' => 'Outbound campaign message',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'template_id' => $template->id,
            'name' => 'Flash Sale Promo',
            'status' => CampaignStatus::PROCESSING,
            'total_recipients' => 1,
            'delivered_count' => 0,
            'read_count' => 0,
        ]);

        $wamid = 'wamid.STATUS_TEST_123';
        $message = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conversation->id,
            'whatsapp_account_id' => $account->id,
            'campaign_id' => $campaign->id,
            'wamid' => $wamid,
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'type' => MessageType::TEXT,
            'body' => 'Outbound campaign message',
            'status' => MessageStatus::SENT,
            'status_rank' => MessageStatus::SENT->rank(),
            'sent_at' => now(),
        ]);

        $recipient = CampaignRecipient::create([
            'campaign_id' => $campaign->id,
            'contact_id' => $contact->id,
            'message_id' => $message->id,
            'wamid' => $wamid,
            'status' => RecipientStatus::SENT,
        ]);

        // 1. Process 'delivered' status
        $deliveredPayload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'metadata' => ['phone_number_id' => 'phone_status_1'],
                                'statuses' => [
                                    [
                                        'id' => $wamid,
                                        'status' => 'delivered',
                                        'timestamp' => (string) time(),
                                        'pricing' => [
                                            'billable' => true,
                                            'category' => 'marketing',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log1 = WebhookLog::create(['payload' => $deliveredPayload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log1->id))->handle();

        $message->refresh();
        $campaign->refresh();
        $this->assertEquals(MessageStatus::DELIVERED, $message->status);
        $this->assertEquals('marketing', $message->pricing_category);
        $this->assertTrue($message->is_billable);
        $this->assertEquals(1, $campaign->delivered_count);

        // 2. Process 'read' status
        $readPayload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'metadata' => ['phone_number_id' => 'phone_status_1'],
                                'statuses' => [
                                    [
                                        'id' => $wamid,
                                        'status' => 'read',
                                        'timestamp' => (string) (time() + 5),
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log2 = WebhookLog::create(['payload' => $readPayload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log2->id))->handle();

        $message->refresh();
        $campaign->refresh();
        $this->assertEquals(MessageStatus::READ, $message->status);
        $this->assertEquals(1, $campaign->read_count);

        // 3. Late arriving 'delivered' status must NOT downgrade status from READ to DELIVERED
        $lateDeliveredPayload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'metadata' => ['phone_number_id' => 'phone_status_1'],
                                'statuses' => [
                                    [
                                        'id' => $wamid,
                                        'status' => 'delivered',
                                        'timestamp' => (string) (time() + 10),
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log3 = WebhookLog::create(['payload' => $lateDeliveredPayload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log3->id))->handle();

        $message->refresh();
        $campaign->refresh();
        $this->assertEquals(MessageStatus::READ, $message->status);
        $this->assertEquals(1, $campaign->delivered_count); // Not double incremented
    }

    // 6. Template Status Webhooks
    public function test_template_status_webhook_updates_template(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Tpl WS', 'tpl@example.com');
        $account = $this->createAccount($workspace);

        $template = Template::create([
            'workspace_id' => $workspace->id,
            'whatsapp_account_id' => $account->id,
            'meta_template_id' => 'meta_tpl_555',
            'name' => 'seasonal_discount',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::PENDING,
            'body_text' => 'Get 20% off today!',
        ]);

        $payload = [
            'entry' => [
                [
                    'id' => $account->waba_id,
                    'changes' => [
                        [
                            'field' => 'message_template_status_update',
                            'value' => [
                                'message_template_id' => 'meta_tpl_555',
                                'message_template_name' => 'seasonal_discount',
                                'message_template_language' => 'en_US',
                                'event' => 'APPROVED',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create(['payload' => $payload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log->id))->handle();

        $template->refresh();
        $this->assertEquals(TemplateStatus::APPROVED, $template->status);
    }

    public function test_reconnecting_soft_deleted_account_restores_in_same_workspace_and_blocks_other_workspaces(): void
    {
        [$workspaceA, $ownerA] = $this->createWorkspaceWithUser('Org A', 'ownerA_reconnect@example.com');
        [$workspaceB, $ownerB] = $this->createWorkspaceWithUser('Org B', 'ownerB_reconnect@example.com');

        $account = $this->createAccount($workspaceA, [
            'phone_number_id' => 'phone_soft_deleted_123',
            'waba_id' => 'waba_orig',
        ]);
        $accountId = $account->id;

        // Soft delete the account
        $account->delete();
        $this->assertSoftDeleted('whatsapp_accounts', ['id' => $accountId]);

        // Workspace B attempts to register the same phone_number_id -> fails with validation exception
        $resB = $this->actingAs($ownerB)
            ->postJson('/dashboard/whatsapp-accounts', [
                'waba_id' => 'waba_b_steal',
                'phone_number_id' => 'phone_soft_deleted_123',
                'display_phone_number' => '+15551239999',
                'access_token' => 'EAAG_some_token_here_for_workspace_b',
            ]);

        $resB->assertUnprocessable();
        $resB->assertJsonValidationErrors(['phone_number_id']);
        $this->assertSoftDeleted('whatsapp_accounts', [
            'id' => $accountId,
            'workspace_id' => $workspaceA->id,
        ]);

        // Workspace A re-registers the same phone_number_id -> restores and updates in place
        $resA = $this->actingAs($ownerA)
            ->postJson('/dashboard/whatsapp-accounts', [
                'waba_id' => 'waba_updated_a',
                'phone_number_id' => 'phone_soft_deleted_123',
                'display_phone_number' => '+15551238888',
                'access_token' => 'EAAG_restored_new_token_string_here',
            ]);

        $resA->assertCreated();
        $account->refresh();
        $this->assertFalse($account->trashed());
        $this->assertEquals($accountId, $account->id);
        $this->assertEquals('waba_updated_a', $account->waba_id);
        $this->assertEquals('+15551238888', $account->display_phone_number);
    }

    public function test_template_status_webhook_for_waba_a_does_not_overwrite_same_named_template_in_waba_b(): void
    {
        [$workspaceA, $ownerA] = $this->createWorkspaceWithUser('Org Tpl A', 'tplA@example.com');
        [$workspaceB, $ownerB] = $this->createWorkspaceWithUser('Org Tpl B', 'tplB@example.com');

        $accountA = $this->createAccount($workspaceA, ['waba_id' => 'waba_unique_aaa']);
        $accountB = $this->createAccount($workspaceB, ['waba_id' => 'waba_unique_bbb']);

        $templateA = Template::create([
            'workspace_id' => $workspaceA->id,
            'whatsapp_account_id' => $accountA->id,
            'meta_template_id' => 'meta_tpl_aaa',
            'name' => 'common_discount',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::PENDING,
            'body_text' => '20% off at A',
        ]);

        $templateB = Template::create([
            'workspace_id' => $workspaceB->id,
            'whatsapp_account_id' => $accountB->id,
            'meta_template_id' => 'meta_tpl_bbb',
            'name' => 'common_discount',
            'language' => 'en_US',
            'category' => TemplateCategory::MARKETING,
            'status' => TemplateStatus::PENDING,
            'body_text' => '20% off at B',
        ]);

        // Webhook for WABA A approving 'common_discount'
        $payload = [
            'entry' => [
                [
                    'id' => 'waba_unique_aaa',
                    'changes' => [
                        [
                            'field' => 'message_template_status_update',
                            'value' => [
                                'message_template_name' => 'common_discount',
                                'message_template_language' => 'en_US',
                                'event' => 'APPROVED',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create(['payload' => $payload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log->id))->handle();

        $templateA->refresh();
        $templateB->refresh();

        $this->assertEquals(TemplateStatus::APPROVED, $templateA->status);
        $this->assertEquals(TemplateStatus::PENDING, $templateB->status);
    }

    public function test_template_webhook_signed_with_per_account_secret_passes_verify_meta_signature(): void
    {
        config(['services.meta.app_secret' => '']); // ensure no global secret used

        [$workspace, $owner] = $this->createWorkspaceWithUser('Org Sec', 'sec@example.com');
        $perAccountSecret = 'per_account_secret_string_123';
        $wabaId = 'waba_sec_777';

        $this->createAccount($workspace, [
            'waba_id' => $wabaId,
            'app_secret' => $perAccountSecret,
        ]);

        // Template status payload has entry.0.id = waba_id, but NO metadata.phone_number_id
        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [
                [
                    'id' => $wabaId,
                    'changes' => [
                        [
                            'field' => 'message_template_status_update',
                            'value' => [
                                'message_template_id' => 'meta_123',
                                'message_template_name' => 'welcome_offer',
                                'message_template_language' => 'en_US',
                                'event' => 'APPROVED',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $jsonPayload = json_encode($payload);
        $signature = 'sha256='.hash_hmac('sha256', (string) $jsonPayload, $perAccountSecret);

        $response = $this->call(
            'POST',
            '/api/webhooks/whatsapp',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $signature,
            ],
            (string) $jsonPayload
        );

        $response->assertOk();
    }

    public function test_inbound_message_from_soft_deleted_contact_restores_contact(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Org Contact', 'contact@example.com');
        $account = $this->createAccount($workspace, ['phone_number_id' => 'phone_contact_test']);

        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '15559876543',
            'profile_name' => 'Alice Inbound',
            'source' => 'manual',
        ]);

        $contact->delete();
        $this->assertTrue($contact->trashed());

        $payload = [
            'entry' => [
                [
                    'id' => $account->waba_id,
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'messaging_product' => 'whatsapp',
                                'metadata' => [
                                    'display_phone_number' => '+15551234567',
                                    'phone_number_id' => 'phone_contact_test',
                                ],
                                'contacts' => [
                                    [
                                        'profile' => ['name' => 'Alice Inbound'],
                                        'wa_id' => '15559876543',
                                    ],
                                ],
                                'messages' => [
                                    [
                                        'from' => '15559876543',
                                        'id' => 'wamid_restored_contact_msg',
                                        'timestamp' => (string) time(),
                                        'text' => ['body' => 'Hello again!'],
                                        'type' => 'text',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $log = WebhookLog::create(['payload' => $payload, 'created_at' => now()]);
        (new ProcessWhatsAppWebhookJob($log->id))->handle();

        $contact->refresh();
        $this->assertFalse($contact->trashed());
        $this->assertDatabaseHas('messages', [
            'wamid' => 'wamid_restored_contact_msg',
        ]);
        $this->assertDatabaseHas('conversations', [
            'contact_id' => $contact->id,
            'whatsapp_account_id' => $account->id,
        ]);
    }

    public function test_agent_role_does_not_receive_webhook_verify_token_on_workspace_page(): void
    {
        [$workspace, $owner] = $this->createWorkspaceWithUser('Org Perms', 'owner_perms@example.com', WorkspaceRole::OWNER);
        $this->createAccount($workspace, [
            'webhook_verify_token' => 'super_secret_verify_token_999',
        ]);

        // Owner sees the verify token
        $ownerRes = $this->actingAs($owner)->get('/dashboard/workspace');
        $ownerRes->assertOk();
        $ownerRes->assertInertia(fn ($page) => $page
            ->component('Dashboard/Workspace')
            ->where('whatsappAccount.webhook_verify_token', 'super_secret_verify_token_999')
        );

        // Create an Agent user in the same workspace
        $agent = User::create([
            'name' => 'Agent Perms',
            'email' => 'agent_perms@example.com',
            'password' => bcrypt('Secret1234!'),
        ]);
        $agent->forceFill(['email_verified_at' => now(), 'current_workspace_id' => $workspace->id])->save();
        $workspace->users()->attach($agent->id, [
            'role' => WorkspaceRole::AGENT->value,
            'is_available' => true,
        ]);

        // Agent should receive NULL for webhook_verify_token
        $agentRes = $this->actingAs($agent)->get('/dashboard/workspace');
        $agentRes->assertOk();
        $agentRes->assertInertia(fn ($page) => $page
            ->component('Dashboard/Workspace')
            ->where('whatsappAccount.webhook_verify_token', null)
        );
    }
}
