<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\OptInStatus;
use App\Enums\WorkspaceRole;
use App\Models\Contact;
use App\Models\Tag;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ContactTest extends TestCase
{
    use RefreshDatabase;

    protected function createWorkspaceWithUser(string $name = 'Acme Corp', string $email = 'test@example.com'): array
    {
        $user = User::create([
            'name' => $name,
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

    public function test_contacts_index_renders_workspace_contacts_and_tags(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $tag = Tag::create(['workspace_id' => $workspace->id, 'name' => 'VIP', 'color' => 'emerald']);
        $contact = Contact::create([
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Rahul',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);
        $contact->tags()->attach($tag->id);

        $response = $this->actingAs($user)->get('/dashboard/contacts');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Contacts/Index')
            ->has('initialContacts', 1)
            ->has('initialTags', 1)
        );
    }

    public function test_store_contact_normalizes_phone_and_attaches_tags(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $tag = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Leads', 'color' => 'emerald']);

        $response = $this->actingAs($user)->postJson('/dashboard/contacts', [
            'phone' => '98765-43210',
            'name' => 'Priya',
            'email' => 'priya@example.com',
            'tag_ids' => [$tag->id],
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'contact' => [
                'wa_id' => '919876543210',
                'name' => 'Priya',
                'opt_in_status' => 'opted_in',
            ],
        ]);

        $this->assertDatabaseHas('contacts', [
            'workspace_id' => $workspace->id,
            'wa_id' => '919876543210',
            'name' => 'Priya',
        ]);
    }

    public function test_import_csv_rows_upserts_and_skips_invalid_numbers(): void
    {
        [$workspace, $user] = $this->createWorkspaceWithUser();
        $tag = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Diwali', 'color' => 'emerald']);

        $response = $this->actingAs($user)->postJson('/dashboard/contacts/import', [
            'rows' => [
                ['phone' => '+91 98111 22333', 'name' => 'Amit', 'city' => 'Surat'],
                ['phone' => '9822233444', 'name' => 'Neha'],
                ['phone' => '123', 'name' => 'Invalid'],
            ],
            'tag_ids' => [$tag->id],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'imported' => 2,
            'updated' => 0,
            'skipped' => 1,
        ]);

        $this->assertDatabaseHas('contacts', [
            'workspace_id' => $workspace->id,
            'wa_id' => '919811122333',
            'city' => 'Surat',
        ]);
    }

    public function test_other_workspace_cannot_update_or_delete_contact(): void
    {
        [$workspaceA] = $this->createWorkspaceWithUser('Acme', 'acme@example.com');
        $contactA = Contact::create([
            'workspace_id' => $workspaceA->id,
            'wa_id' => '919900112233',
            'name' => 'Tenant A Contact',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        [, $userB] = $this->createWorkspaceWithUser('Beta', 'beta@example.com');

        $this->actingAs($userB)
            ->patchJson("/dashboard/contacts/{$contactA->id}", ['name' => 'Hacked'])
            ->assertStatus(404);

        $this->actingAs($userB)
            ->deleteJson("/dashboard/contacts/{$contactA->id}")
            ->assertStatus(404);
    }

    public function test_index_only_returns_active_workspace_contacts_and_tags(): void
    {
        [$workspaceA] = $this->createWorkspaceWithUser('Acme', 'acme2@example.com');
        Tag::create(['workspace_id' => $workspaceA->id, 'name' => 'Tag A', 'color' => 'emerald']);
        Contact::create([
            'workspace_id' => $workspaceA->id,
            'wa_id' => '919900112244',
            'name' => 'Contact A',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);

        [$workspaceB, $userB] = $this->createWorkspaceWithUser('Beta', 'beta2@example.com');
        $tagB = Tag::create(['workspace_id' => $workspaceB->id, 'name' => 'Tag B', 'color' => 'emerald']);
        $contactB = Contact::create([
            'workspace_id' => $workspaceB->id,
            'wa_id' => '919900112255',
            'name' => 'Contact B',
            'opt_in_status' => OptInStatus::OPTED_IN,
        ]);
        $contactB->tags()->attach($tagB->id);

        $response = $this->actingAs($userB)->get('/dashboard/contacts');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Contacts/Index')
            ->has('initialContacts', 1)
            ->has('initialTags', 1)
            ->where('initialContacts.0.name', 'Contact B')
            ->where('initialTags.0.name', 'Tag B')
        );
    }
}
