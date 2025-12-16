import { course, save } from "./storage.js";

const INTERVALS = [1, 3, 7, 14, 30, 60];

export function scheduleInitialReview(video) {
    // Only schedule if not already scheduled and video is completed
    if (video.nextReviewDate) return;

    video.reviewStage = 0;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + INTERVALS[0]);
    video.nextReviewDate = nextDate.toISOString().split('T')[0];
    save();
}

export function processReview(video) {
    video.lastReviewed = new Date().toISOString().split('T')[0];
    video.reviewStage = (video.reviewStage || 0) + 1;

    const daysToAdd = INTERVALS[Math.min(video.reviewStage, INTERVALS.length - 1)];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    video.nextReviewDate = nextDate.toISOString().split('T')[0];
    save();
}

export function getDueReviews() {
    const today = new Date().toISOString().split('T')[0];
    const due = [];

    if (!course.sections) return due;

    course.sections.forEach((section, si) => {
        section.videos.forEach((video, vi) => {
            if (video.nextReviewDate && video.nextReviewDate <= today) {
                due.push({ video, si, vi, sectionTitle: section.title });
            }
        });
    });

    return due;
}

export function resetReview(video) {
    delete video.nextReviewDate;
    delete video.reviewStage;
    delete video.lastReviewed;
    save();
}
