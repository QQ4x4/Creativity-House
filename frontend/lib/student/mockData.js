/**
 * lib/student/mockData.js — Development fixtures for the Student Portal.
 *
 * Used ONLY when the Laravel endpoints in `lib/student/endpoints.js` are not
 * live yet (404/501/network). Shapes match the normalizers in `types.js`
 * exactly, so swapping in the real API is a no-op for components.
 *
 * All values are static constants — never `Date.now()` or `Math.random()` —
 * so server and client renders stay identical (no hydration mismatch).
 */

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

export const MOCK_PROFILE = {
  id: 1,
  first_name: 'Student',
  last_name: 'Account',
  email: 'student@creativity-house.com',
  phone_number: '+967771234567',
  avatar_url: null,
  email_verified: true,
  notification_preferences: {
    course_updates: true,
    new_certificates: true,
    promotional_announcements: false,
  },
};

export const MOCK_ORDERS = [
  {
    order_id: 'CH-2026-0104',
    course_id: 'pm-foundations',
    course_title: 'Project Management Foundations',
    amount: 149,
    currency: 'USD',
    purchased_at: '2026-01-18',
    status: 'paid',
    invoice_url: null,
  },
  {
    order_id: 'CH-2026-0087',
    course_id: 'leadership-coaching',
    course_title: 'Leadership & Team Coaching',
    amount: 199,
    currency: 'USD',
    purchased_at: '2025-11-04',
    status: 'paid',
    invoice_url: null,
  },
  {
    order_id: 'CH-2025-0421',
    course_id: 'strategic-planning',
    course_title: 'Strategic Planning Masterclass',
    amount: 179,
    currency: 'USD',
    purchased_at: '2025-08-22',
    status: 'refunded',
    invoice_url: null,
  },
];

/**
 * Curriculum per course. Lesson IDs are stable strings so completion state and
 * deep links (`?lesson=…`) survive reloads.
 */
export const MOCK_CURRICULUM = {
  'pm-foundations': [
    {
      id: 'pm-1-1',
      module_id: 'pm-m1',
      module_name: 'Module 1: Introduction',
      title: 'Welcome & how this course works',
      video_url: SAMPLE_VIDEOS[0],
      duration_seconds: 412,
      order: 1,
      resources: [
        {
          id: 'pm-1-1-r1',
          title: 'Course roadmap.pdf',
          url: '/files/course-roadmap.pdf',
          type: 'pdf',
          size_bytes: 284000,
        },
      ],
    },
    {
      id: 'pm-1-2',
      module_id: 'pm-m1',
      module_name: 'Module 1: Introduction',
      title: 'What project managers actually do',
      video_url: SAMPLE_VIDEOS[1],
      duration_seconds: 738,
      order: 2,
      resources: [],
    },
    {
      id: 'pm-2-1',
      module_id: 'pm-m2',
      module_name: 'Module 2: Planning & Scope',
      title: 'Building a work breakdown structure',
      video_url: SAMPLE_VIDEOS[2],
      duration_seconds: 1024,
      order: 3,
      resources: [
        {
          id: 'pm-2-1-r1',
          title: 'WBS template.pdf',
          url: '/files/wbs-template.pdf',
          type: 'pdf',
          size_bytes: 512000,
        },
        {
          id: 'pm-2-1-r2',
          title: 'Scope checklist.pdf',
          url: '/files/scope-checklist.pdf',
          type: 'pdf',
          size_bytes: 196000,
        },
      ],
    },
    {
      id: 'pm-2-2',
      module_id: 'pm-m2',
      module_name: 'Module 2: Planning & Scope',
      title: 'Estimating time and cost realistically',
      video_url: SAMPLE_VIDEOS[3],
      duration_seconds: 866,
      order: 4,
      resources: [],
    },
    {
      id: 'pm-3-1',
      module_id: 'pm-m3',
      module_name: 'Module 3: Execution & Risk',
      title: 'Running a risk register',
      video_url: SAMPLE_VIDEOS[0],
      duration_seconds: 954,
      order: 5,
      resources: [
        {
          id: 'pm-3-1-r1',
          title: 'Risk register.pdf',
          url: '/files/risk-register.pdf',
          type: 'pdf',
          size_bytes: 340000,
        },
      ],
    },
    {
      id: 'pm-3-2',
      module_id: 'pm-m3',
      module_name: 'Module 3: Execution & Risk',
      title: 'Closing a project and capturing lessons',
      video_url: SAMPLE_VIDEOS[1],
      duration_seconds: 621,
      order: 6,
      locked: true,
      resources: [],
    },
  ],

  'leadership-coaching': [
    {
      id: 'lc-1-1',
      module_id: 'lc-m1',
      module_name: 'Module 1: Coaching Mindset',
      title: 'From manager to coach',
      video_url: SAMPLE_VIDEOS[2],
      duration_seconds: 505,
      order: 1,
      resources: [
        {
          id: 'lc-1-1-r1',
          title: 'Coaching questions.pdf',
          url: '/files/coaching-questions.pdf',
          type: 'pdf',
          size_bytes: 220000,
        },
      ],
    },
    {
      id: 'lc-1-2',
      module_id: 'lc-m1',
      module_name: 'Module 1: Coaching Mindset',
      title: 'Active listening in 1-on-1s',
      video_url: SAMPLE_VIDEOS[3],
      duration_seconds: 690,
      order: 2,
      resources: [],
    },
    {
      id: 'lc-2-1',
      module_id: 'lc-m2',
      module_name: 'Module 2: Difficult Conversations',
      title: 'Giving feedback that lands',
      video_url: SAMPLE_VIDEOS[0],
      duration_seconds: 812,
      order: 3,
      resources: [
        {
          id: 'lc-2-1-r1',
          title: 'Feedback script.pdf',
          url: '/files/feedback-script.pdf',
          type: 'pdf',
          size_bytes: 168000,
        },
      ],
    },
    {
      id: 'lc-2-2',
      module_id: 'lc-m2',
      module_name: 'Module 2: Difficult Conversations',
      title: 'Handling underperformance',
      video_url: SAMPLE_VIDEOS[1],
      duration_seconds: 744,
      order: 4,
      resources: [],
    },
  ],

  'strategic-planning': [
    {
      id: 'sp-1-1',
      module_id: 'sp-m1',
      module_name: 'Module 1: Strategy Basics',
      title: 'Vision, mission, and measurable goals',
      video_url: SAMPLE_VIDEOS[2],
      duration_seconds: 578,
      order: 1,
      resources: [],
    },
    {
      id: 'sp-1-2',
      module_id: 'sp-m1',
      module_name: 'Module 1: Strategy Basics',
      title: 'Reading the competitive landscape',
      video_url: SAMPLE_VIDEOS[3],
      duration_seconds: 902,
      order: 2,
      resources: [
        {
          id: 'sp-1-2-r1',
          title: 'SWOT worksheet.pdf',
          url: '/files/swot-worksheet.pdf',
          type: 'pdf',
          size_bytes: 240000,
        },
      ],
    },
    {
      id: 'sp-2-1',
      module_id: 'sp-m2',
      module_name: 'Module 2: Execution',
      title: 'Turning strategy into quarterly OKRs',
      video_url: SAMPLE_VIDEOS[0],
      duration_seconds: 1105,
      order: 3,
      resources: [],
    },
  ],
};

export const MOCK_COURSES = [
  {
    id: 'pm-foundations',
    title: 'Project Management Foundations',
    slug: 'pm-foundations',
    cover_image_url:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=70',
    instructor_name: 'Dr. Ahmed Al-Sharafi',
    level: 'Beginner',
    enrolled_at: '2026-01-18',
    certificate_earned: false,
    next_lesson_id: 'pm-2-2',
    progress: {
      course_id: 'pm-foundations',
      total_lessons: 6,
      completed_lessons: ['pm-1-1', 'pm-1-2', 'pm-2-1'],
      total_learning_seconds: 8400,
    },
  },
  {
    id: 'leadership-coaching',
    title: 'Leadership & Team Coaching',
    slug: 'leadership-coaching',
    cover_image_url:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=70',
    instructor_name: 'Dr. Ahmed Al-Sharafi',
    level: 'Intermediate',
    enrolled_at: '2025-11-04',
    certificate_earned: true,
    next_lesson_id: 'lc-1-1',
    progress: {
      course_id: 'leadership-coaching',
      total_lessons: 4,
      completed_lessons: ['lc-1-1', 'lc-1-2', 'lc-2-1', 'lc-2-2'],
      total_learning_seconds: 10800,
    },
  },
  {
    id: 'strategic-planning',
    title: 'Strategic Planning Masterclass',
    slug: 'strategic-planning',
    cover_image_url:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=70',
    instructor_name: 'Dr. Ahmed Al-Sharafi',
    level: 'Advanced',
    enrolled_at: '2025-08-22',
    certificate_earned: false,
    next_lesson_id: 'sp-1-1',
    progress: {
      course_id: 'strategic-planning',
      total_lessons: 3,
      completed_lessons: [],
      total_learning_seconds: 2700,
    },
  },
];

export function findMockCourse(courseId) {
  return MOCK_COURSES.find((course) => String(course.id) === String(courseId)) || null;
}

export function findMockCurriculum(courseId) {
  return MOCK_CURRICULUM[String(courseId)] || [];
}
