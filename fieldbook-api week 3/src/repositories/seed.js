/**
 * Seed data for a fresh database (memory or Postgres). Mirrors the front
 * end's js/api/mockData.js in shape and spirit — dates are relative to
 * "today" so the demo account always shows a believable mix of active,
 * overdue and completed work.
 */
import { DEMO_ACCOUNT } from '../constants.js';

const addDays = (date, n) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
};
const iso = (date) => date.toISOString().slice(0, 10);

/** @returns {{ user: {email, name, password}, projects: Array }} */
export function buildSeed(today = new Date()) {
  const day = (n) => iso(addDays(today, n));

  const task = (title, status, priority, due = '', notes = '') => ({ title, notes, status, priority, due });

  const projects = [
    {
      name: 'Spring product drop',
      description: 'Ship the limited-run enamel pin collection with a launch email and a preorder page.',
      status: 'active',
      dueDate: day(12),
      tasks: [
        task('Order packaging samples', 'done', 'medium', day(-9)),
        task('Photograph the six pin designs', 'done', 'high', day(-6), 'Use the north window, morning light.'),
        task('Write product copy', 'done', 'medium', day(-3)),
        task('Set up preorder page', 'doing', 'high', day(2), 'Waiting on final prices from Priya.'),
        task('Draft launch email', 'doing', 'medium', day(4)),
        task('Confirm shipping rates with courier', 'todo', 'high', day(-2), 'Two quotes so far. Need the third.'),
        task('Schedule social posts', 'todo', 'low', day(10)),
      ],
    },
    {
      name: 'Website relaunch',
      description: 'Move the shop and blog to the new design system and cut page weight in half.',
      status: 'active',
      dueDate: day(30),
      tasks: [
        task('Audit current page weight', 'done', 'medium', day(-25)),
        task('Choose type and colour palette', 'done', 'high', day(-14)),
        task('Build home page template', 'doing', 'high', day(6)),
        task('Migrate blog posts', 'todo', 'medium', day(15)),
        task('Write 301 redirect map', 'todo', 'high', day(20), 'Keep every URL that has inbound links.'),
        task('Run accessibility check', 'todo', 'medium', day(24)),
      ],
    },
    {
      name: 'Workshop safety audit',
      description: 'Annual walkthrough of the workshop: extinguishers, ventilation, first aid and signage.',
      status: 'active',
      dueDate: day(5),
      tasks: [
        task('Check extinguisher service dates', 'done', 'high', day(-12)),
        task('Test ventilation fan speed', 'done', 'medium', day(-10)),
        task('Restock first aid kits', 'done', 'medium', day(-7)),
        task('File the audit report', 'doing', 'high', day(3)),
      ],
    },
    {
      name: 'Customer interviews',
      description: 'Twelve short calls with repeat buyers to learn why they come back.',
      status: 'hold',
      dueDate: day(45),
      tasks: [
        task('Write the interview script', 'done', 'medium', day(-8)),
        task('Recruit twelve participants', 'todo', 'high', day(14)),
        task('Book calls on the calendar', 'todo', 'medium', day(21)),
      ],
    },
    {
      name: 'Q3 budget review',
      description: 'Compare actual spend against plan and set targets for next quarter.',
      status: 'done',
      dueDate: day(-6),
      tasks: [
        task('Export ledger for the quarter', 'done', 'medium', day(-20)),
        task('Reconcile card statements', 'done', 'high', day(-15)),
        task('Share summary with the team', 'done', 'low', day(-6)),
      ],
    },
    {
      name: 'Team offsite planning',
      description: 'Pick a venue and agenda for the autumn offsite. No tasks yet.',
      status: 'active',
      dueDate: '',
      tasks: [],
    },
  ];

  return {
    user: { email: DEMO_ACCOUNT.email, name: 'Sam Rivera', password: DEMO_ACCOUNT.password },
    projects,
  };
}
