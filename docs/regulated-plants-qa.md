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

## Remaining MVP Gap

Permit upload is not a dedicated listing field yet. If a seller must upload DENR/CITES documents, add a listing compliance document upload path and show it in the admin queue.
