const announcementService = require('../../services/announcement.service');
const reply = require('../../lib/reply');

/** API controller for announcements: JSON only (/api/announcements). */

async function index(req, res) {
  reply.list(res, await announcementService.listAnnouncements(req.query));
}

async function show(req, res) {
  reply.ok(res, await announcementService.getAnnouncement(req.params.id));
}

async function store(req, res) {
  reply.created(res, await announcementService.createAnnouncement(req.body));
}

async function replace(req, res) {
  reply.ok(res, await announcementService.replaceAnnouncement(req.params.id, req.body));
}

async function update(req, res) {
  reply.ok(res, await announcementService.updateAnnouncement(req.params.id, req.body));
}

async function destroy(req, res) {
  const item = await announcementService.deleteAnnouncement(req.params.id);
  reply.ok(res, { id: item.id, deleted: true });
}

module.exports = { index, show, store, replace, update, destroy };
