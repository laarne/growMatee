-- Add the listing status used when admins request more regulated-plant documents.

alter type public.listing_status add value if not exists 'needs_more_documents';
