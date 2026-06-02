# Regulated Plants QA

Last checked: 2026-06-02

GrowMate's regulation checker is a compliance helper, not legal advice.

## Live Data Audit

- Total rows: 1,248
- DAO 2026 + RA 9147 rows: 1,237
- RA 9165 rows: 8
- CITES rows: 3
- Status counts after cleanup: 7 illegal, 1,224 needs_permit, 17 needs_review
- Missing taxon_name: 0
- Missing source_url: 0
- Missing notes: 0
- Duplicate normalized_taxon_name rows: 0

## Matching Regression Checklist

These inputs should be checked after scanner or data changes:

| Input | Expected status | Reason |
| --- | --- | --- |
| Cannabis sativa | illegal | RA 9165 exact species |
| cannabis sativa | illegal | Case-insensitive exact species |
| Cannabis sativa L. | illegal | Author suffix stripped to binomial |
| marijuana | illegal | Seller alias |
| Papaver somniferum | illegal | RA 9165 exact species |
| opium poppy | illegal | Seller alias |
| Nepenthes truncata | needs_permit | DAO exact species beats broad CITES review |
| Nepenthes | needs_review | Broad CITES genus |
| pitcher plant | needs_review | Seller alias to broad CITES genus |
| Orchidaceae | needs_review | Broad CITES family |
| orchid | needs_review | Seller alias to broad CITES family |
| Vanda sanderiana | needs_permit | DAO exact species with author-insensitive binomial |
| waling-waling | needs_permit | DAO common name |
| Cycas | needs_review | Broad cycad group should require review |
| Cycadaceae | needs_review | Broad CITES family |
| narra | needs_permit | DAO common name |
| Pterocarpus indicus | needs_permit | DAO exact species with author-insensitive binomial |

## Publishing Rules

- illegal: block listing.
- needs_permit: keep seller listing in review until admin verifies permit/documents.
- needs_review: keep seller listing in review until admin verifies exact species.
- no match: allow normal review flow and show the compliance disclaimer.

## Permit Upload QA

- needs_permit listing without a document: listing stays in review, permit_review_status becomes required, admin approval is blocked until a document exists.
- needs_permit listing with a PDF/JPG/PNG/WEBP document: file uploads to the private regulated-plant-permits bucket, listing stays in review, permit_review_status becomes submitted.
- needs_review listing with optional document: file uploads privately and admin can review it, but a document is not required by default.
- illegal listing: seller cannot submit it and the database trigger keeps illegal scan results blocked.
- clear listing: normal review/publication path still works and permit_review_status remains not_required.
- seller access control: sellers can upload/read only files under their own user-id folder in regulated-plant-permits.
- public access control: public users cannot read regulated-plant-permits files.
- admin access control: admins can open seller permit documents from the review queue.
- non-admin moderation: non-admin users cannot call approval/rejection/request-more-documents RPC behavior successfully.
- admin actions: approve sets permit_review_status to approved when a permit was required; reject/block set rejected; request more documents sets needs_more_documents.

## End-to-End QA Pass

Checked on 2026-06-02 after permit upload hardening:

- Clear listing flow: safe Leafy AI results can publish immediately as active when regulationStatus is null, saleStatus is safe_to_sell, confidence is at least 35, and permit_review_status is not_required.
- Illegal flow: seller UI blocks submission for illegal scan results; the database trigger also forces illegal scan results to blocked.
- Needs permit flow: seller sees the permit card, can upload PDF/JPG/PNG/WEBP, listing stays in review, and permit_review_status becomes submitted when a file path exists.
- Needs review flow: seller can optionally upload supporting documents, and listing stays in review until admin action.
- More-documents flow: admin can request more documents; seller stock list shows a More Docs state and lets the seller upload a replacement/supporting document.
- Admin review flow: admin queue shows regulation status/ref/matches, permit status, seller/listing details, and a signed private document link when present.
- Storage security: regulated-plant-permits is private, limited to 10 MB, and only allows PDF/JPG/PNG/WEBP. Policies are authenticated owner/admin read, verified seller own-folder insert, and owner update.
- Database QA checks: invalid permit_review_status = 0; needs_permit public without approved permit = 0; illegal not blocked = 0; duplicate permit paths = 0; permit storage objects without a listing = 0.

## Bugs Fixed In QA

- Clear safe listings were still being submitted to review from the seller UI. Fixed by setting initialStatus to active only when Leafy AI returns safe_to_sell.
- The listing insert policy no longer allowed the safe clear active path after permit hardening. Fixed with a guarded policy requiring safe_to_sell, confidence >= 35, no regulationStatus, and permit_review_status = not_required.
- Request-more-documents had no seller follow-up upload path. Fixed by adding an Upload documents action for needs_more_documents listings.

## Remaining MVP Gap

Permit upload now exists for listing review. The next polish step is adding seller-side replacement after a listing is already in needs_more_documents status.
