/**
 * Seed data for the mock API. Dates are generated relative to "today" so the
 * demo always shows realistic overdue / due-soon states.
 */
import { addDays, toISODate } from '../utils/format.js';

export function createSeed(today = new Date()) {
  const day = (n) => toISODate(addDays(today, n));
  const stamp = (n, hour = 10) => {
    const d = addDays(today, n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  let n = 0;
  const task = (title, status, priority, due = '', notes = '') => ({
    id: `t-seed-${++n}`,
    title,
    notes,
    status,
    priority,
    due,
    createdAt: stamp(-20, 9 + (n % 8)),
  });

  return [
    {
      id: 'p-launch',
      name: 'Spring product drop',
      description: 'Ship the limited-run enamel pin collection with a launch email and a preorder page.',
      status: 'active',
      dueDate: day(12),
      createdAt: stamp(-24),
      updatedAt: stamp(0, 8),
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
      id: 'p-web',
      name: 'Website relaunch',
      description: 'Move the shop and blog to the new design system and cut page weight in half.',
      status: 'active',
      dueDate: day(30),
      createdAt: stamp(-40),
      updatedAt: stamp(-1, 15),
      tasks: [
        task('Audit current page weight', 'done', 'medium', day(-25)),
        task('Choose type and colour palette', 'done', 'high', day(-14)),
        task('Build home page template', 'doing', 'high', day(6)),
        task('Migrate blog posts', 'todo', 'medium', day(15)),
        task('Write 301 redirect map', 'todo', 'high', day(20), 'Keep every URL that has inbound links.'),
        task('Run accessibility check', 'todo', 'medium', day(24)),
        task('Load-test the checkout', 'todo', 'low', day(27)),
        task('Announce the new site', 'todo', 'low', day(30)),
      ],
    },
    {
      id: 'p-safety',
      name: 'Workshop safety audit',
      description: 'Annual walkthrough of the workshop: extinguishers, ventilation, first aid and signage.',
      status: 'active',
      dueDate: day(5),
      createdAt: stamp(-18),
      updatedAt: stamp(-2, 11),
      tasks: [
        task('Check extinguisher service dates', 'done', 'high', day(-12)),
        task('Test ventilation fan speed', 'done', 'medium', day(-10)),
        task('Restock first aid kits', 'done', 'medium', day(-7)),
        task('Replace faded exit signage', 'done', 'low', day(-4)),
        task('File the audit report', 'doing', 'high', day(3)),
      ],
    },
    {
      id: 'p-interviews',
      name: 'Customer interviews',
      description: 'Twelve short calls with repeat buyers to learn why they come back.',
      status: 'hold',
      dueDate: day(45),
      createdAt: stamp(-12),
      updatedAt: stamp(-8, 14),
      tasks: [
        task('Write the interview script', 'done', 'medium', day(-8)),
        task('Recruit twelve participants', 'todo', 'high', day(14)),
        task('Book calls on the calendar', 'todo', 'medium', day(21)),
        task('Summarise themes', 'todo', 'low', day(40)),
      ],
    },
    {
      id: 'p-budget',
      name: 'Q3 budget review',
      description: 'Compare actual spend against plan and set targets for next quarter.',
      status: 'done',
      dueDate: day(-6),
      createdAt: stamp(-60),
      updatedAt: stamp(-6, 16),
      tasks: [
        task('Export ledger for the quarter', 'done', 'medium', day(-20)),
        task('Reconcile card statements', 'done', 'high', day(-15)),
        task('Draft next-quarter targets', 'done', 'medium', day(-9)),
        task('Share summary with the team', 'done', 'low', day(-6)),
      ],
    },
    {
      id: 'p-offsite',
      name: 'Team offsite planning',
      description: 'Pick a venue and agenda for the autumn offsite. No tasks yet.',
      status: 'active',
      dueDate: '',
      createdAt: stamp(-1),
      updatedAt: stamp(-1, 9),
      tasks: [],
    },
  ];
}
