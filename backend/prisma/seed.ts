// LAMBERT AI - database seed.
// Creates subjects, topics (incl. the Environmental Engineering module),
// AI provider configuration, and development admin/demo accounts.
// It does NOT fabricate student analytics data.

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const SUBJECTS: Array<{ id: string; name: string; slug: string; iconKey: string; description: string; order: number }> = [
  { id: 'sub_math', name: 'Mathematics', slug: 'mathematics', iconKey: 'calculator', description: 'Pure and applied mathematics across algebra, analysis, geometry and statistics.', order: 1 },
  { id: 'sub_physics', name: 'Physics', slug: 'physics', iconKey: 'atom', description: 'Mechanics, electromagnetism, thermodynamics, waves and modern physics.', order: 2 },
  { id: 'sub_chemistry', name: 'Chemistry', slug: 'chemistry', iconKey: 'flask', description: 'Organic and inorganic chemistry, physical chemistry and laboratory techniques.', order: 3 },
  { id: 'sub_biology', name: 'Biology', slug: 'biology', iconKey: 'dna', description: 'Cell biology, genetics, ecology, physiology and evolution.', order: 4 },
  { id: 'sub_cs', name: 'Computer Science', slug: 'computer-science', iconKey: 'code', description: 'Programming, algorithms, data structures, systems and theory.', order: 5 },
  { id: 'sub_environmental', name: 'Environmental Engineering', slug: 'environmental-engineering', iconKey: 'leaf', description: 'Water supply, wastewater, solid waste, air pollution, hydrology and environmental management.', order: 6 },
  { id: 'sub_civil', name: 'Civil Engineering', slug: 'civil-engineering', iconKey: 'building', description: 'Structures, geotechnics, transportation, materials and construction.', order: 7 },
  { id: 'sub_electrical', name: 'Electrical Engineering', slug: 'electrical-engineering', iconKey: 'zap', description: 'Circuits, power systems, electronics, control and signal processing.', order: 8 },
  { id: 'sub_mechanical', name: 'Mechanical Engineering', slug: 'mechanical-engineering', iconKey: 'cog', description: 'Thermodynamics, mechanics of materials, machine design and manufacturing.', order: 9 },
  { id: 'sub_business', name: 'Business', slug: 'business', iconKey: 'briefcase', description: 'Management, marketing, operations, finance and entrepreneurship.', order: 10 },
  { id: 'sub_economics', name: 'Economics', slug: 'economics', iconKey: 'trending-up', description: 'Microeconomics, macroeconomics and quantitative methods.', order: 11 },
  { id: 'sub_statistics', name: 'Statistics', slug: 'statistics', iconKey: 'bar-chart', description: 'Descriptive and inferential statistics, probability and data analysis.', order: 12 },
  { id: 'sub_programming', name: 'Programming', slug: 'programming', iconKey: 'terminal', description: 'Practical software development in multiple languages and paradigms.', order: 13 },
  { id: 'sub_it', name: 'Information Technology', slug: 'information-technology', iconKey: 'network', description: 'Networking, databases, cloud, cybersecurity and IT management.', order: 14 },
  { id: 'sub_accounting', name: 'Accounting', slug: 'accounting', iconKey: 'dollar', description: 'Financial accounting, management accounting, auditing and taxation.', order: 15 },
  { id: 'sub_geography', name: 'Geography', slug: 'geography', iconKey: 'globe', description: 'Physical geography, human geography, cartography and GIS.', order: 16 },
];

// Structural data (formulas, examples, learning materials) for Environmental Engineering topics (§25).
const ENVIRONMENTAL_META: Record<string, Record<string, unknown>> = {
  'Water Supply Engineering': {
    formulas: [
      { symbol: 'Q = A × v', meaning: 'Flow rate = cross-sectional area × velocity', units: 'm³/s' },
      { symbol: 'Per-capita consumption = Total daily demand / Population', meaning: 'Design demand for water supply systems', units: 'L/capita/day' },
      { symbol: 'Head loss (Darcy-Weisbach): hf = f (L/D) (v²/2g)', meaning: 'Pipe friction head loss', units: 'm' },
    ],
    examples: [
      'Design a distribution network for a town of 50,000 people with a per-capita demand of 150 L/day and peak factor 2.5.',
    ],
    materials: ['Water supply and distribution', 'Pumps and pumping stations', 'Water storage reservoirs'],
  },
  'Wastewater Treatment': {
    formulas: [
      { symbol: 'BOD removal efficiency = (BODin - BODout) / BODin × 100%', meaning: 'Treatment performance', units: '%' },
      { symbol: 'Sludge volume = solids mass / solids concentration', meaning: 'Sludge handling', units: 'm³' },
    ],
    examples: [
      'Compute BOD removal for a plant receiving 300 mg/L BOD and discharging 20 mg/L.',
    ],
    materials: ['Primary treatment', 'Activated sludge process', 'Secondary clarification'],
  },
  'Solid Waste Management': {
    formulas: [
      { symbol: 'Waste generation rate = mass of waste / population / day', meaning: 'Per-capita waste generation', units: 'kg/capita/day' },
    ],
    examples: ['Estimate landfill volume for a 20-year design life at 4 kg/person/day of mixed waste.'],
    materials: ['Waste collection systems', 'Recycling and composting', 'Sanitary landfill design'],
  },
  'Air Pollution Control': {
    formulas: [
      { symbol: 'C = Q / (2π σy σz u) × exp(-y²/(2σy²))', meaning: 'Gaussian plume ground-level concentration', units: 'g/m³' },
      { symbol: 'Capture efficiency = mass captured / mass generated × 100%', meaning: 'Control device performance', units: '%' },
    ],
    examples: ['Apply the Gaussian dispersion model to estimate downwind concentrations.'],
    materials: ['Particulate control (cyclones, ESP, bag filters)', 'Gaseous control (scrubbers, adsorption)'],
  },
  'Environmental Chemistry': {
    formulas: [
      { symbol: 'pH = -log[H+]', meaning: 'Acidity measure', units: '-' },
      { symbol: 'Hardness (mg/L CaCO3) = 2.497[Ca]+4.118[Mg]', meaning: 'Water hardness estimation', units: 'mg/L' },
    ],
    examples: ['Convert ion concentrations to total hardness as CaCO3.'],
    materials: ['Water chemistry', 'Fate and transport of pollutants'],
  },
  Hydrology: {
    formulas: [
      { symbol: 'Rational formula: Q = C i A', meaning: 'Peak runoff estimation', units: 'm³/s' },
      { symbol: 'Mass balance: P = E + R + ΔS', meaning: 'Water balance', units: 'mm' },
    ],
    examples: ['Estimate peak flow with the rational method for a catchment in the region.'],
    materials: ['Precipitation analysis', 'Runoff and hydrographs', 'Groundwater hydrology'],
  },
  'Water Quality': {
    formulas: [
      { symbol: 'DO saturation depends on temperature and salinity', meaning: 'Dissolved oxygen limits aquatic life', units: 'mg/L' },
      { symbol: 'Water quality index (WQI) = weighted average of sub-indices', meaning: 'Overall water quality score', units: '0-100' },
    ],
    examples: ['Classify a water sample using standard WQI thresholds.'],
    materials: ['Physical, chemical and biological parameters', 'Drinking water standards (WHO-aligned principles only)'],
  },
  'Environmental Impact Assessment': {
    formulas: [],
    examples: ['Screen an industrial project against EIA significance criteria.'],
    materials: ['Screening and scoping', 'Mitigation and monitoring plans'],
  },
  'Climate Change': {
    formulas: [
      { symbol: 'Emissions = Activity × Emission factor', meaning: 'GHG inventory estimation', units: 'tCO₂e' },
    ],
    examples: ['Compute scope-1 emissions from diesel consumption given an emission factor.'],
    materials: ['Greenhouse gas accounting', 'Climate risk assessment'],
  },
  'Renewable Energy': {
    formulas: [
      { symbol: 'Wind power = ½ ρ A v³', meaning: 'Power in the wind', units: 'W' },
      { symbol: 'PV energy = Irradiance × Area × Efficiency × t', meaning: 'Solar output estimation', units: 'kWh' },
    ],
    examples: ['Estimate annual energy from a 5 MW wind turbine site given average wind speed.'],
    materials: ['Solar and wind resource assessment', 'Grid integration basics'],
  },
  'Environmental Microbiology': {
    formulas: [],
    examples: ['Explain the role of coliforms as water-quality indicator organisms.'],
    materials: ['Indicator organisms', 'Biological treatment microbiology'],
  },
  'GIS and Remote Sensing': {
    formulas: [],
    examples: ['Plan a land-cover classification using satellite imagery.'],
    materials: ['Raster and vector data', 'Land use classification'],
  },
  'Environmental Management': {
    formulas: [],
    examples: ['Outline an ISO 14001-style environmental management system cycle.'],
    materials: ['EMS frameworks', 'Environmental due diligence'],
  },
  'Occupational Health and Safety': {
    formulas: [
      { symbol: 'Risk = Likelihood × Severity', meaning: 'Risk rating matrix', units: 'score' },
    ],
    examples: ['Rate a confined-space entry task using a 5×5 risk matrix.'],
    materials: ['Hazard identification', 'Control hierarchy (elimination to PPE)'],
  },
};

const TOPICS_BY_SUBJECT: Record<string, Array<{ name: string; difficulty: string; order: number }>> = {
  sub_math: [
    { name: 'Algebra', difficulty: 'beginner', order: 1 },
    { name: 'Calculus', difficulty: 'intermediate', order: 2 },
    { name: 'Linear Algebra', difficulty: 'intermediate', order: 3 },
    { name: 'Probability', difficulty: 'intermediate', order: 4 },
    { name: 'Trigonometry', difficulty: 'beginner', order: 5 },
  ],
  sub_physics: [
    { name: 'Mechanics', difficulty: 'beginner', order: 1 },
    { name: 'Electromagnetism', difficulty: 'intermediate', order: 2 },
    { name: 'Thermodynamics', difficulty: 'intermediate', order: 3 },
    { name: 'Waves and Optics', difficulty: 'intermediate', order: 4 },
    { name: 'Modern Physics', difficulty: 'advanced', order: 5 },
  ],
  sub_chemistry: [
    { name: 'Atomic Structure', difficulty: 'beginner', order: 1 },
    { name: 'Chemical Bonding', difficulty: 'intermediate', order: 2 },
    { name: 'Organic Chemistry', difficulty: 'intermediate', order: 3 },
    { name: 'Physical Chemistry', difficulty: 'advanced', order: 4 },
    { name: 'Analytical Chemistry', difficulty: 'advanced', order: 5 },
  ],
  sub_biology: [
    { name: 'Cell Biology', difficulty: 'beginner', order: 1 },
    { name: 'Genetics', difficulty: 'intermediate', order: 2 },
    { name: 'Ecology', difficulty: 'intermediate', order: 3 },
    { name: 'Human Physiology', difficulty: 'advanced', order: 4 },
    { name: 'Evolution', difficulty: 'intermediate', order: 5 },
  ],
  sub_cs: [
    { name: 'Programming Fundamentals', difficulty: 'beginner', order: 1 },
    { name: 'Data Structures', difficulty: 'intermediate', order: 2 },
    { name: 'Algorithms', difficulty: 'intermediate', order: 3 },
    { name: 'Operating Systems', difficulty: 'advanced', order: 4 },
    { name: 'Databases', difficulty: 'intermediate', order: 5 },
  ],
  sub_environmental: Object.entries(ENVIRONMENTAL_META).map(([name], i) => ({
    name,
    difficulty: i < 4 ? 'beginner' : i < 9 ? 'intermediate' : 'advanced',
    order: i + 1,
  })),
  sub_civil: [
    { name: 'Structural Analysis', difficulty: 'intermediate', order: 1 },
    { name: 'Geotechnical Engineering', difficulty: 'intermediate', order: 2 },
    { name: 'Transportation Engineering', difficulty: 'beginner', order: 3 },
    { name: 'Construction Materials', difficulty: 'beginner', order: 4 },
    { name: 'Surveying', difficulty: 'beginner', order: 5 },
  ],
  sub_electrical: [
    { name: 'Circuit Analysis', difficulty: 'beginner', order: 1 },
    { name: 'Power Systems', difficulty: 'advanced', order: 2 },
    { name: 'Electronics', difficulty: 'intermediate', order: 3 },
    { name: 'Control Systems', difficulty: 'advanced', order: 4 },
    { name: 'Signals and Systems', difficulty: 'intermediate', order: 5 },
  ],
  sub_mechanical: [
    { name: 'Engineering Mechanics', difficulty: 'beginner', order: 1 },
    { name: 'Thermodynamics', difficulty: 'intermediate', order: 2 },
    { name: 'Fluid Mechanics', difficulty: 'intermediate', order: 3 },
    { name: 'Machine Design', difficulty: 'advanced', order: 4 },
    { name: 'Manufacturing Processes', difficulty: 'beginner', order: 5 },
  ],
  sub_business: [
    { name: 'Principles of Management', difficulty: 'beginner', order: 1 },
    { name: 'Marketing', difficulty: 'beginner', order: 2 },
    { name: 'Operations Management', difficulty: 'intermediate', order: 3 },
    { name: 'Entrepreneurship', difficulty: 'intermediate', order: 4 },
    { name: 'Business Finance', difficulty: 'intermediate', order: 5 },
  ],
  sub_economics: [
    { name: 'Microeconomics', difficulty: 'beginner', order: 1 },
    { name: 'Macroeconomics', difficulty: 'beginner', order: 2 },
    { name: 'Econometrics', difficulty: 'advanced', order: 3 },
    { name: 'International Trade', difficulty: 'intermediate', order: 4 },
  ],
  sub_statistics: [
    { name: 'Descriptive Statistics', difficulty: 'beginner', order: 1 },
    { name: 'Probability Distributions', difficulty: 'intermediate', order: 2 },
    { name: 'Statistical Inference', difficulty: 'intermediate', order: 3 },
    { name: 'Regression Analysis', difficulty: 'advanced', order: 4 },
    { name: 'Experimental Design', difficulty: 'advanced', order: 5 },
  ],
  sub_programming: [
    { name: 'Python', difficulty: 'beginner', order: 1 },
    { name: 'JavaScript / TypeScript', difficulty: 'beginner', order: 2 },
    { name: 'Object-Oriented Design', difficulty: 'intermediate', order: 3 },
    { name: 'Web Development', difficulty: 'intermediate', order: 4 },
    { name: 'Software Testing', difficulty: 'intermediate', order: 5 },
  ],
  sub_it: [
    { name: 'Computer Networks', difficulty: 'intermediate', order: 1 },
    { name: 'Cloud Computing', difficulty: 'intermediate', order: 2 },
    { name: 'Cybersecurity', difficulty: 'intermediate', order: 3 },
    { name: 'Database Administration', difficulty: 'intermediate', order: 4 },
    { name: 'IT Service Management', difficulty: 'beginner', order: 5 },
  ],
  sub_accounting: [
    { name: 'Financial Accounting', difficulty: 'beginner', order: 1 },
    { name: 'Management Accounting', difficulty: 'intermediate', order: 2 },
    { name: 'Auditing', difficulty: 'advanced', order: 3 },
    { name: 'Taxation', difficulty: 'advanced', order: 4 },
  ],
  sub_geography: [
    { name: 'Physical Geography', difficulty: 'beginner', order: 1 },
    { name: 'Human Geography', difficulty: 'beginner', order: 2 },
    { name: 'Cartography', difficulty: 'intermediate', order: 3 },
    { name: 'Geographic Information Systems', difficulty: 'advanced', order: 4 },
  ],
};

async function seedSubjectsAndTopics() {
  for (const subj of SUBJECTS) {
    await prisma.subject.upsert({
      where: { slug: subj.slug },
      update: { name: subj.name, description: subj.description, iconKey: subj.iconKey, order: subj.order, isActive: true },
      create: { id: subj.id, ...subj },
    });

    const topics = TOPICS_BY_SUBJECT[subj.id] ?? [];
    for (const t of topics) {
      const meta = subj.id === 'sub_environmental' ? ENVIRONMENTAL_META[t.name] : undefined;
      await prisma.topic.upsert({
        where: { subjectId_name: { subjectId: subj.id, name: t.name } },
        update: { order: t.order, isActive: true, materialMeta: (meta ?? undefined) as never },
        create: {
          subjectId: subj.id,
          name: t.name,
          difficulty: t.difficulty,
          order: t.order,
          description: meta ? `Structured learning module for ${t.name}.` : undefined,
          materialMeta: (meta ?? undefined) as never,
        },
      });
    }
  }
}

async function seedAiProviders() {
  const providers = [
    {
      code: 'openai',
      label: 'OpenAI',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      enabled: Boolean(process.env.OPENAI_API_KEY),
      isDefault: true,
      priority: 10,
    },
    {
      code: 'microsoft',
      label: 'Microsoft AI',
      model: process.env.MICROSOFT_AI_MODEL || 'gpt-4o-mini',
      enabled: Boolean(process.env.MICROSOFT_AI_ENDPOINT && process.env.MICROSOFT_AI_API_KEY),
      isDefault: false,
      priority: 20,
    },
    {
      code: 'google_gemini',
      label: 'Google Gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      enabled: Boolean(process.env.GEMINI_API_KEY),
      isDefault: false,
      priority: 30,
    },
    {
      code: 'anthropic_claude',
      label: 'Anthropic Claude',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      enabled: Boolean(process.env.ANTHROPIC_API_KEY),
      isDefault: false,
      priority: 40,
    },
  ];

  for (const p of providers) {
    await prisma.aiProvider.upsert({
      where: { code: p.code },
      update: {
        label: p.label,
        enabled: p.enabled,
        isDefault: p.isDefault,
        priority: p.priority,
        config: { model: p.model } as never,
      },
      create: {
        code: p.code,
        label: p.label,
        enabled: p.enabled,
        isDefault: p.isDefault,
        isFallback: true,
        priority: p.priority,
        config: { model: p.model } as never,
      },
    });
  }
}

async function seedUsers() {
  const rounds = 10;
  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@12345', rounds);
  const demoPassword = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD || 'Student@12345', rounds);

  await prisma.user.upsert({
    where: { email: 'admin@lambertai.com' },
    update: { isActive: true },
    create: {
      email: 'admin@lambertai.com',
      passwordHash: adminPassword,
      name: 'Lambert Admin',
      role: Role.admin,
      emailVerified: true,
      profile: { create: { preferredLanguage: 'en' } },
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@lambertai.com' },
    update: { isActive: true },
    create: {
      email: 'demo@lambertai.com',
      passwordHash: demoPassword,
      name: 'Demo Student',
      role: Role.student,
      emailVerified: true,
      profile: { create: { preferredLanguage: 'en' } },
    },
  });
}

async function main() {
  await seedSubjectsAndTopics();
  await seedAiProviders();
  await seedUsers();
  console.log('Seed complete: subjects, topics, AI providers, and dev accounts created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());