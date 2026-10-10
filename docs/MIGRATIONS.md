# Database Migrations

*(This file will track SQL migrations executed in Supabase)*


## Phase 03: Core Schema and RLS Policies

**Applied Migrations**:
1. \20261010000100_core.sql\ - Creates all public schema tables, foreign keys, and private schema.
2. \20261010000200_access.sql\ - Enables RLS on all public tables, adds read policies, and creates private security-definer helpers.
3. \20261010000300_rate_limit.sql\ - Creates the \private.consume_rate\ function for atomic rate-limiting.

Status: Pending execution by user in Supabase SQL Editor.

