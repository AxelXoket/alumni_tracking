const { announcementModel, CATEGORIES, PRIORITIES } = require('../models/announcement.model');
const HttpError = require('../lib/http-error');
const { validate } = require('../lib/validate');

const ANNOUNCEMENT_SCHEMA = {
  title: { required: true, min: 3, max: 150 },
  content: { required: true, min: 10, max: 5000 },
  category: { required: true, oneOf: CATEGORIES },
  priority: { oneOf: PRIORITIES, default: 'normal' },
  author: { required: true, min: 2, max: 100 },
};

function parseFilters({ category, priority, search } = {}) {
  const filters = {};
  if (category) {
    filters.category = String(category).toLowerCase();
    if (!CATEGORIES.includes(filters.category)) {
      throw HttpError.badRequest(`category filter must be one of: ${CATEGORIES.join(', ')}`);
    }
  }
  if (priority) {
    filters.priority = String(priority).toLowerCase();
    if (!PRIORITIES.includes(filters.priority)) {
      throw HttpError.badRequest(`priority filter must be one of: ${PRIORITIES.join(', ')}`);
    }
  }
  if (search && String(search).trim()) filters.search = String(search).trim();
  return filters;
}

async function listAnnouncements(query) {
  return announcementModel.findAll(parseFilters(query));
}

async function getAnnouncement(id) {
  const item = await announcementModel.findById(id);
  if (!item) throw HttpError.notFound(`Announcement ${id} not found`);
  return item;
}

async function createAnnouncement(body) {
  return announcementModel.create(validate(body, ANNOUNCEMENT_SCHEMA));
}

async function replaceAnnouncement(id, body) {
  await getAnnouncement(id);
  return announcementModel.update(id, validate(body, ANNOUNCEMENT_SCHEMA));
}

async function updateAnnouncement(id, body) {
  await getAnnouncement(id);
  return announcementModel.update(id, validate(body, ANNOUNCEMENT_SCHEMA, { partial: true }));
}

async function deleteAnnouncement(id) {
  const item = await getAnnouncement(id);
  await announcementModel.delete(id);
  return item;
}

async function getCategoryCounts() {
  return announcementModel.countByCategory();
}

module.exports = {
  CATEGORIES,
  PRIORITIES,
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  replaceAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getCategoryCounts,
};
