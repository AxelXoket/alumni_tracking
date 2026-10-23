const announcementService = require('../../services/announcement.service');
const { flashFrom, formAction } = require('../../lib/web');

/** Web controller for announcements: board page, detail page and form fallbacks. */

async function index(req, res) {
  const [announcements, counts] = await Promise.all([
    announcementService.listAnnouncements(),
    announcementService.getCategoryCounts(),
  ]);
  res.render('announcements/index', {
    title: 'Announcements',
    active: 'announcements',
    announcements,
    counts,
    categories: announcementService.CATEGORIES,
    priorities: announcementService.PRIORITIES,
    flash: flashFrom(req.query),
    scripts: ['/js/app.js'],
  });
}

async function show(req, res) {
  const announcement = await announcementService.getAnnouncement(req.params.id);
  res.render('announcements/show', { title: announcement.title, active: 'announcements', announcement });
}

const create = formAction(
  '/announcements',
  (req) => announcementService.createAnnouncement(req.body),
  'created',
);

const update = formAction(
  '/announcements',
  (req) => announcementService.replaceAnnouncement(req.params.id, req.body),
  'updated',
);

const destroy = formAction(
  '/announcements',
  (req) => announcementService.deleteAnnouncement(req.params.id),
  'deleted',
);

module.exports = { index, show, create, update, destroy };
