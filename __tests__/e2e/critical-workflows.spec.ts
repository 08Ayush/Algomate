import { test, expect } from '@playwright/test';

/**
 * E2E Test: Timetable Approval Workflow
 * Tests the complete workflow from draft → pending → approved
 */
test.describe('Timetable Approval Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as college admin
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@test.edu');
        await page.fill('input[name="password"]', 'test123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin/dashboard');
    });

    test('should complete full approval workflow', async ({ page }) => {
        // Step 1: Create timetable
        await page.goto('/admin/timetables/create');
        await page.fill('input[name="name"]', 'E2E Test Timetable');
        await page.selectOption('select[name="semester"]', '3');
        await page.click('button:has-text("Create")');

        // Verify creation
        await expect(page.locator('text=Timetable created')).toBeVisible();

        // Step 2: Add classes to timetable
        await page.click('button:has-text("Add Class")');
        await page.selectOption('select[name="subject"]', 'CS101');
        await page.selectOption('select[name="day"]', 'Monday');
        await page.selectOption('select[name="time"]', '09:00');
        await page.click('button:has-text("Save Class")');

        // Step 3: Submit for approval
        await page.click('button:has-text("Submit for Approval")');
        await expect(page.locator('text=Submitted for approval')).toBeVisible();

        // Step 4: View in review queue (as publisher)
        await page.goto('/admin/timetables/review-queue');
        await expect(page.locator('text=E2E Test Timetable')).toBeVisible();

        // Step 5: Approve timetable  
        await page.click('button[data-action="approve"]');
        await expect(page.locator('text=Timetable approved')).toBeVisible();

        // Step 6: Verify published status
        await page.goto('/admin/timetables');
        const publishedBadge = page.locator('span:has-text("Published")');
        await expect(publishedBadge).toBeVisible();
    });

    test('should reject timetable with reason', async ({ page }) => {
        // Navigate to review queue
        await page.goto('/admin/timetables/review-queue');

        // Reject a timetable
        await page.click('button[data-action="reject"]');
        await page.fill('textarea[name="reason"]', 'Schedule conflicts detected');
        await page.click('button:has-text("Confirm Rejection")');

        // Verify rejection
        await expect(page.locator('text=Timetable rejected')).toBeVisible();
    });
});

/**
 * E2E Test: Elective Bucket Management
 */
test.describe('Elective Bucket Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@test.edu');
        await page.fill('input[name="password"]', 'test123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin/dashboard');
    });

    test('should create and publish elective bucket', async ({ page }) => {
        // Create bucket
        await page.goto('/admin/buckets');
        await page.click('button:has-text("Create Bucket")');

        await page.fill('input[name="name"]', 'E2E Elective Bucket');
        await page.selectOption('select[name="type"]', 'GENERAL');
        await page.fill('input[name="minSelection"]', '1');
        await page.fill('input[name="maxSelection"]', '2');
        await page.click('button:has-text("Create")');

        // Verify creation
        await expect(page.locator('text=E2E Elective Bucket')).toBeVisible();

        // Publish for students
        await page.click('button[data-action="publish"]');
        await expect(page.locator('text=Published')).toBeVisible();
    });
});
