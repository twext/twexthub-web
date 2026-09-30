# Organizations

An organization is a namespace shared by several accounts. It has a profile of its own, owns extensions like an account does, and keeps its own list of owners, so people can leave and join without handing over the namespace.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Creating one](#creating-one)
- [The organization page](#the-organization-page)
- [Managing an organization](#managing-an-organization)
  - [Profile and images](#profile-and-images)
  - [Owners](#owners)
  - [Webhooks](#webhooks)
  - [Deleting one](#deleting-one)
- [Organizations and extensions](#organizations-and-extensions)
- [Invitations to co-own an extension](#invitations-to-co-own-an-extension)
- [Notifications](#notifications)
- [For administrators](#for-administrators)
- [Namespace rules](#namespace-rules)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Creating one

`/organizations` lists the organizations the registry knows about, and takes new ones. The form asks for a namespace, a display name, an optional bio, and optional links:

- **Namespace** — the `@name` the organization publishes under, following the same rules as an account namespace (see below).
- **Display name** — the human name shown next to the namespace.
- **Bio, website, GitHub** — the same fields an account has.

The first account to create an organization goes on its owner list: without one, nobody could change it. Creation needs the current Terms accepted and is rate limited like a signup.

The namespace is shared with accounts, so a name an account already holds is refused too. It is fixed from that point on — the registry does not rename organizations, and the settings form has no field for it.

The listing at `/organizations` is public, newest first, and paginated. A row links to the organization's page, and to its settings page for whoever is allowed in.

## The organization page

`/org/:namespace` is the public page. It shows the banner, avatar, display name, `@namespace`, bio, links, and creation date, then the extensions the organization owns. It is the same shape as an account page, and `/api/v1/users/:namespace` answers for an organization too, with `kind` set to `organization` and the account-only fields left out — that field is what tells the two apart.

## Managing an organization

`/org/:namespace/settings` is reachable by the accounts on the owner list, and by registry administrators. Anyone else who opens the URL is told they are not an owner.

### Profile and images

Display name, bio, website, and GitHub are edited in place and saved with **Save profile**. The website is checked for an `http://` or `https://` address before the request goes out. The API also accepts external `avatarUrl` and `bannerUrl` values for organizations; the form here uploads files instead. The avatar and banner are uploaded as files (PNG, JPEG, GIF, WebP, or AVIF, up to 2 MB) rather than linked by URL, and either can be removed. Uploads are served from the organization's own path (`/api/v1/orgs/:namespace/avatar`) and are not shared with an account of the same name. With no upload the page asks the registry for the avatar, which serves the identicon, or redirects to an external image; a banner is not invented, so an organization without one shows no banner at all.

### Owners

The owner list is public — anyone can see who can act for the organization — while adding and removing owners is not.

Owners are accounts, and every one of them can do everything: publish under the namespace, edit the profile, edit this list, and delete the organization. An account cannot be an owner of another organization, so the add form takes an account namespace only.

To add someone, type their namespace and press **Add**. They are notified, and the list is reloaded. Removing an owner asks for confirmation first.

The last owner cannot be removed — the control is not offered when the list holds one, and the registry refuses it anyway. An organization nobody owns could not be changed by anyone, so it is handed on or deleted instead. The same is true of the account side: an account that is an organization's last owner cannot delete its own account.

### Webhooks

A webhook registered here watches every extension in the namespace rather than one `id`, so a publish, yank, deprecation, rejection or owner change anywhere under `@acme` reaches the same URL with nothing registered per extension. The per-extension webhooks on an extension's page are a separate collection and are unaffected.

The panel is the one used on an extension: the same events, the same signing secret returned once at creation and never by the listing, the same pause and delete.

### Deleting one

Deleting an organization asks for the namespace to be typed out before it will do anything. The registry removes the profile and everything under the namespace with it: extensions, versions, images, webhooks and the owner list. The image blobs are content-addressed and kept while any version anywhere still references them, so another namespace's files are not disturbed. There is no undo, so the confirmation is deliberately slow to pass.

## Organizations and extensions

Extensions belong to a namespace, so an organization publishes under `@org/id` exactly as an account publishes under `@user/id`. Nothing about the CLI changes: log in with an account that is on the organization's owner list, and `twext publish` publishes for the organization.

The organization page lists what it owns, and `/api/v1/orgs/:namespace/extensions` is the collection behind it. Owners see the whole list, including extensions still in the moderation queue, so a pending submission does not look like a missing one.

An organization that co-owns an extension is listed on that extension marked as an organization, so it is clear that an account below it is answering for a group.

## Invitations to co-own an extension

Adding an owner to an extension is also an invitation, and the invited account is told about it. Until it is accepted the candidate is not an owner and the extension's owner list does not carry them.

The invitation is answered on the extension's own page, which is where a candidate lands from the notification: **Accept** takes the co-ownership, **Decline** withdraws it. Accepting grants management — publishing, private versions, the listing — without moving the published address, the download history, the tags or the webhooks, which stay with the namespace that published it.

An organization has no inbox of its own, so an account acting for one finds its invitations on each extension's page. That is why the page asks the registry whether the signed-in account is holding one, and stays quiet when the answer is no or cannot be read.

## Notifications

Kinds are worded rather than shown as the codes the registry sends, and each one navigates somewhere useful:

| Kind                         | Wording                       | Opens                      |
| ---------------------------- | ----------------------------- | -------------------------- |
| `organization.owner.added`   | Added as organization owner   | that organization's owners |
| `organization.owner.removed` | Removed as organization owner | that organization's owners |
| `extension.owner.invited`    | Owner invitation              | the extension              |
| `extension.owner.withdrawn`  | Invitation withdrawn          | the extension              |
| `extension.owner.added`      | Added as owner                | the extension              |
| `extension.owner.removed`    | Removed as owner              | the extension              |

An organization's owner change names only the organization, with no extension to go to, and the owner list is managed at that organization's own settings page — so those two open there. A notification that names nothing has no link at all.

## For administrators

The admin console lists organizations on their own tab. A namespace is either an account or an organization and the registry lists both through `/users`, so an organization left in the accounts list would offer a role, a quota and a Terms state that mean nothing for it. It has none of those: no password, no sessions, no tokens, no Terms.

The Organizations tab is what an admin can do to one:

- **Owners** reads the owner list on demand. It is the same public list the organization page shows, and an empty one means nobody can change the organization.
- **View** and **Settings** open the organization, and its settings page, which an admin may use without being on the owner list.
- **Delete** removes the organization and everything under it, after a confirmation that says what goes with it.

The tools that read the account list skip organizations for the same reason: the health check would report every organization as having unaccepted Terms, the prune tool would offer to delete namespaces it cannot delete, and the accounts export would fill a row of account columns with blanks. The Maintenance export has an Organizations dataset of its own.

## Namespace rules

A namespace is 1 to 40 characters of lowercase letters, digits, and hyphens, and cannot start or end with a hyphen. The registry refuses the names it serves itself, and `admin` among them.

An organization and an account cannot hold the same namespace at once, since the extension URL `@namespace/id` does not say which of the two owns it. The registry also keeps the account endpoints away from organizations: signing in as one is a `403`, as is editing or deleting one through `/users/:namespace`. Reading is allowed, and that is how the two pages are told apart.
