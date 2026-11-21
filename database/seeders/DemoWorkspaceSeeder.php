<?php

namespace Database\Seeders;

use App\Enums\ConversationStatus;
use App\Enums\MessageDirection;
use App\Enums\MessageSenderType;
use App\Enums\MessageStatus;
use App\Enums\MessageType;
use App\Enums\OptInStatus;
use App\Enums\TemplateCategory;
use App\Enums\TemplateStatus;
use App\Enums\WhatsAppAccountStatus;
use App\Enums\WhatsAppConnectionType;
use App\Enums\WorkspacePlan;
use App\Enums\WorkspaceRole;
use App\Models\AiAgent;
use App\Models\AiKnowledgeSource;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\ConversationNote;
use App\Models\KanbanBoard;
use App\Models\KanbanCard;
use App\Models\KanbanColumn;
use App\Models\Message;
use App\Models\Tag;
use App\Models\Template;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoWorkspaceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Owner User
        $admin = User::firstOrCreate(
            ['email' => 'admin@whatsappautomation.test'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'phone' => '919727509785',
            ]
        );
        $admin->forceFill(['email_verified_at' => now()])->save();

        // 2. Workspace
        $workspace = Workspace::firstOrCreate(
            ['slug' => 'stpl-industrial-lasers'],
            [
                'name' => 'STPL Industrial Lasers',
                'owner_id' => $admin->id,
                'timezone' => 'Asia/Kolkata',
                'plan' => WorkspacePlan::GROWTH,
                'settings' => [
                    'currency' => 'INR',
                    'industry' => 'Industrial Machinery',
                ],
            ]
        );

        if (! $admin->workspaces()->where('workspaces.id', $workspace->id)->exists()) {
            $admin->workspaces()->attach($workspace->id, [
                'role' => WorkspaceRole::OWNER,
                'is_available' => true,
            ]);
        }

        $admin->update(['current_workspace_id' => $workspace->id]);

        // 3. WhatsApp Account
        $account = WhatsAppAccount::firstOrCreate(
            ['phone_number_id' => '200000000000001'],
            [
                'workspace_id' => $workspace->id,
                'connection_type' => WhatsAppConnectionType::MANUAL,
                'is_coexistence' => false,
                'waba_id' => '100000000000001',
                'display_phone_number' => '+91 97266 54060',
                'verified_name' => 'STPL Industrial Lasers',
                'access_token' => 'EAAGdummy_meta_access_token_for_testing',
                'webhook_verify_token' => 'stpl_webhook_verify_token_12345',
                'quality_rating' => 'GREEN',
                'messaging_limit_tier' => 'TIER_10K',
                'status' => WhatsAppAccountStatus::CONNECTED,
                'last_synced_at' => now(),
            ]
        );

        // 4. Tags
        $tagPlate = Tag::firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'Plate Cutting'],
            ['color' => '#16a34a']
        );
        $tagTube = Tag::firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'Tube Cutting'],
            ['color' => '#2563eb']
        );
        $tagHot = Tag::firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'Hot Lead'],
            ['color' => '#dc2626']
        );

        // 5. 10 Indian B2B Contacts
        $contactsData = [
            [
                'name' => 'Bhavik Patel',
                'wa_id' => '919727509785',
                'company_name' => 'Patel Laser Fab',
                'city' => 'Surat',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagPlate->id, $tagHot->id],
            ],
            [
                'name' => 'Rajesh Sharma',
                'wa_id' => '919825012345',
                'company_name' => 'Sharma Engineering Works',
                'city' => 'Ahmedabad',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagTube->id],
            ],
            [
                'name' => 'Amit Deshmukh',
                'wa_id' => '919822098765',
                'company_name' => 'Deshmukh Precision Components',
                'city' => 'Pune',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagPlate->id],
            ],
            [
                'name' => 'Vikram Malhotra',
                'wa_id' => '919811054321',
                'company_name' => 'Malhotra Heavy Fab',
                'city' => 'Delhi',
                'opt_in_status' => OptInStatus::UNKNOWN,
                'tags' => [$tagHot->id],
            ],
            [
                'name' => 'Haresh Vala',
                'wa_id' => '919979011223',
                'company_name' => 'Saurashtra Metal Craft',
                'city' => 'Botad',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagTube->id],
            ],
            [
                'name' => 'Gurpreet Singh',
                'wa_id' => '919876033445',
                'company_name' => 'Terai Agro & Laser',
                'city' => 'Lakhimpur',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagPlate->id],
            ],
            [
                'name' => 'Nilesh Gade',
                'wa_id' => '919422077889',
                'company_name' => 'Pravara Laser Systems',
                'city' => 'Ahmednagar',
                'opt_in_status' => OptInStatus::OPTED_OUT,
                'tags' => [$tagTube->id],
            ],
            [
                'name' => 'Sunil Shukla',
                'wa_id' => '919935066778',
                'company_name' => 'Shukla Industrial Spares',
                'city' => 'Unnao',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagHot->id],
            ],
            [
                'name' => 'Pravin Shinde',
                'wa_id' => '919765044556',
                'company_name' => 'Nashik Sheet Metal',
                'city' => 'Dindori',
                'opt_in_status' => OptInStatus::UNKNOWN,
                'tags' => [$tagPlate->id],
            ],
            [
                'name' => 'Sourav Banerjee',
                'wa_id' => '919830022334',
                'company_name' => 'Bengal Laser Technology',
                'city' => 'Kolkata',
                'opt_in_status' => OptInStatus::OPTED_IN,
                'tags' => [$tagHot->id],
            ],
        ];

        $seededContacts = [];
        foreach ($contactsData as $item) {
            $tags = $item['tags'];
            unset($item['tags']);

            $contact = Contact::firstOrCreate(
                ['workspace_id' => $workspace->id, 'wa_id' => $item['wa_id']],
                array_merge($item, ['opted_in_at' => now()->subDays(5)])
            );

            $contact->tags()->sync($tags);
            $seededContacts[$contact->wa_id] = $contact;
        }

        // 6. Template
        $template = Template::firstOrCreate(
            [
                'whatsapp_account_id' => $account->id,
                'name' => 'stpl_laser_cutting_promo',
                'language' => 'en',
            ],
            [
                'workspace_id' => $workspace->id,
                'meta_template_id' => 'meta_tmpl_10001',
                'category' => TemplateCategory::MARKETING,
                'status' => TemplateStatus::APPROVED,
                'header_type' => 'IMAGE',
                'body_text' => 'Hello {{1}}, explore our high-precision fiber laser cutting machines with up to {{2}} kW power. Schedule your live demo today!',
                'components' => [
                    ['type' => 'HEADER', 'format' => 'IMAGE'],
                    ['type' => 'BODY', 'text' => 'Hello {{1}}, explore our high-precision fiber laser cutting machines with up to {{2}} kW power. Schedule your live demo today!'],
                    ['type' => 'FOOTER', 'text' => 'STPL Industrial Lasers - Surat, Gujarat'],
                    ['type' => 'BUTTONS', 'buttons' => [
                        ['type' => 'QUICK_REPLY', 'text' => 'Book Demo'],
                        ['type' => 'QUICK_REPLY', 'text' => 'Talk to Sales'],
                    ]],
                ],
                'last_synced_at' => now(),
            ]
        );

        // 7. Conversations & Messages
        // Conv 1: Active (Bhavik)
        $bhavik = $seededContacts['919727509785'];
        $conv1 = Conversation::firstOrCreate(
            ['whatsapp_account_id' => $account->id, 'contact_id' => $bhavik->id],
            [
                'workspace_id' => $workspace->id,
                'assigned_to' => $admin->id,
                'status' => ConversationStatus::OPEN,
                'unread_count' => 0,
                'last_inbound_at' => now()->subHours(6),
                'window_expires_at' => now()->addHours(18),
                'last_message_at' => now()->subMinutes(15),
            ]
        );

        $msg1In = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv1->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid.HBgLOTE5NzI3NTA5Nzg1FQIAEhggNzcxOTkyRkEyM0M2',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'Interested in 6kW fiber laser machine price.',
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
            'sent_at' => now()->subHours(6),
            'delivered_at' => now()->subHours(6),
        ]);

        $msg1Out = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv1->id,
            'whatsapp_account_id' => $account->id,
            'sent_by_user_id' => $admin->id,
            'wamid' => 'wamid.HBgLOTE5NzI3NTA5Nzg1FQIAERggODkxMDkyRkEyM0Q3',
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'type' => MessageType::TEXT,
            'body' => 'Hello Bhavik, sending the 6kW brochure and specs sheet.',
            'status' => MessageStatus::READ,
            'status_rank' => MessageStatus::READ->rank(),
            'sent_at' => now()->subMinutes(15),
            'delivered_at' => now()->subMinutes(14),
            'read_at' => now()->subMinutes(12),
        ]);

        $conv1->update([
            'last_message_id' => $msg1Out->id,
            'last_message_preview' => $msg1Out->body,
        ]);

        // Conversation Note on Conv 1
        ConversationNote::firstOrCreate(
            ['conversation_id' => $conv1->id, 'user_id' => $admin->id],
            [
                'workspace_id' => $workspace->id,
                'body' => 'Lead has 2 CNC punch presses and plans to replace one with a 6kW fiber laser by next month.',
            ]
        );

        // Conv 2: Active (Rajesh)
        $rajesh = $seededContacts['919825012345'];
        $conv2 = Conversation::firstOrCreate(
            ['whatsapp_account_id' => $account->id, 'contact_id' => $rajesh->id],
            [
                'workspace_id' => $workspace->id,
                'assigned_to' => $admin->id,
                'status' => ConversationStatus::OPEN,
                'unread_count' => 0,
                'last_inbound_at' => now()->subHours(4),
                'window_expires_at' => now()->addHours(20),
                'last_message_at' => now()->subMinutes(30),
            ]
        );

        $msg2In = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv2->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid.HBgLOTE5ODI1MDEyMzQ1FQIAEhggNTYxOTkyRkEyM0E0',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'Can you cut 20mm mild steel with your fiber laser?',
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
            'sent_at' => now()->subHours(4),
            'delivered_at' => now()->subHours(4),
        ]);

        $msg2Out = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv2->id,
            'whatsapp_account_id' => $account->id,
            'sent_by_user_id' => $admin->id,
            'wamid' => 'wamid.HBgLOTE5ODI1MDEyMzQ1FQIAERggODkyMDkyRkEyM0I1',
            'direction' => MessageDirection::OUTBOUND,
            'sender_type' => MessageSenderType::AGENT,
            'type' => MessageType::TEXT,
            'body' => 'Yes Rajesh, our 12kW model cuts up to 30mm mild steel effortlessly.',
            'status' => MessageStatus::READ,
            'status_rank' => MessageStatus::READ->rank(),
            'sent_at' => now()->subMinutes(30),
            'delivered_at' => now()->subMinutes(29),
            'read_at' => now()->subMinutes(25),
        ]);

        $conv2->update([
            'last_message_id' => $msg2Out->id,
            'last_message_preview' => $msg2Out->body,
        ]);

        // Conv 3: Expired (Vikram)
        $vikram = $seededContacts['919811054321'];
        $conv3 = Conversation::firstOrCreate(
            ['whatsapp_account_id' => $account->id, 'contact_id' => $vikram->id],
            [
                'workspace_id' => $workspace->id,
                'assigned_to' => $admin->id,
                'status' => ConversationStatus::EXPIRED,
                'unread_count' => 1,
                'last_inbound_at' => now()->subHours(29),
                'window_expires_at' => now()->subHours(5),
                'last_message_at' => now()->subHours(29),
            ]
        );

        $msg3In = Message::create([
            'workspace_id' => $workspace->id,
            'conversation_id' => $conv3->id,
            'whatsapp_account_id' => $account->id,
            'wamid' => 'wamid.HBgLOTE5ODExMDU0MzIxFQIAEhggOTkxOTkyRkEyM0Yx',
            'direction' => MessageDirection::INBOUND,
            'sender_type' => MessageSenderType::CONTACT,
            'type' => MessageType::TEXT,
            'body' => 'Please send quotation for laser pipe cutting.',
            'status' => MessageStatus::DELIVERED,
            'status_rank' => MessageStatus::DELIVERED->rank(),
            'sent_at' => now()->subHours(29),
            'delivered_at' => now()->subHours(29),
        ]);

        $conv3->update([
            'last_message_id' => $msg3In->id,
            'last_message_preview' => $msg3In->body,
        ]);

        // 8. Kanban Board, Columns & Cards
        $board = KanbanBoard::firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'Sales Pipeline'],
            ['type' => 'leads']
        );

        $col1 = KanbanColumn::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'New Lead'],
            ['position' => 0, 'color' => '#64748b']
        );
        $col2 = KanbanColumn::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'Qualified'],
            ['position' => 1, 'color' => '#3b82f6']
        );
        $col3 = KanbanColumn::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'Demo Scheduled'],
            ['position' => 2, 'color' => '#8b5cf6', 'auto_template_id' => $template->id]
        );
        $col4 = KanbanColumn::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'Closed Won'],
            ['position' => 3, 'color' => '#10b981']
        );

        $amit = $seededContacts['919822098765'];

        KanbanCard::firstOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Vikram Malhotra - 4kW Pipe Laser'],
            [
                'board_id' => $board->id,
                'column_id' => $col1->id,
                'contact_id' => $vikram->id,
                'conversation_id' => $conv3->id,
                'assigned_to' => $admin->id,
                'description' => 'Inquiry for high-speed pipe cutting unit.',
                'deal_value' => 4500000.00,
                'position' => 0,
                'due_at' => now()->addDays(2),
            ]
        );

        KanbanCard::firstOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Rajesh Sharma - 12kW Heavy Plate Machine'],
            [
                'board_id' => $board->id,
                'column_id' => $col2->id,
                'contact_id' => $rajesh->id,
                'conversation_id' => $conv2->id,
                'assigned_to' => $admin->id,
                'description' => 'Wants cutting demo on 25mm mild steel plate.',
                'deal_value' => 8500000.00,
                'position' => 0,
                'due_at' => now()->addDays(5),
            ]
        );

        KanbanCard::firstOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Bhavik Patel - 6kW Fiber Laser Demo'],
            [
                'board_id' => $board->id,
                'column_id' => $col3->id,
                'contact_id' => $bhavik->id,
                'conversation_id' => $conv1->id,
                'assigned_to' => $admin->id,
                'description' => 'Demo scheduled for next Tuesday at Surat showroom.',
                'deal_value' => 6200000.00,
                'position' => 0,
                'due_at' => now()->addDays(4),
            ]
        );

        KanbanCard::firstOrCreate(
            ['workspace_id' => $workspace->id, 'title' => 'Amit Deshmukh - 3kW Sheet Metal Laser'],
            [
                'board_id' => $board->id,
                'column_id' => $col4->id,
                'contact_id' => $amit->id,
                'conversation_id' => null,
                'assigned_to' => $admin->id,
                'description' => 'PO received, advance payment processed.',
                'deal_value' => 3800000.00,
                'position' => 0,
                'due_at' => now()->subDay(),
            ]
        );

        // 9. AI Agent & Knowledge Source
        $aiAgent = AiAgent::firstOrCreate(
            ['workspace_id' => $workspace->id, 'name' => 'STPL Technical Assistant'],
            [
                'provider' => 'gemini',
                'model' => 'gemini-2.5-flash',
                'system_prompt' => 'You are an expert sales and technical assistant for STPL Industrial Lasers. Assist customers with machine cutting capacities, gas consumption, and maintenance queries.',
                'handoff_keywords' => ['agent', 'human', 'engineer', 'call'],
                'transcribe_voice_notes' => true,
                'is_active' => false,
            ]
        );

        AiKnowledgeSource::firstOrCreate(
            ['ai_agent_id' => $aiAgent->id, 'title' => 'STPL_Fiber_Laser_Cutting_Specs_2026.pdf'],
            [
                'workspace_id' => $workspace->id,
                'type' => 'pdf',
                'file_path' => 'knowledge/stpl_specs_2026.pdf',
                'status' => 'ready',
                'extracted_text' => 'Fiber Laser Cut Capacities: 3kW: up to 12mm MS, 5mm SS. 6kW: up to 22mm MS, 10mm SS. 12kW: up to 35mm MS, 20mm SS.',
            ]
        );
    }
}
