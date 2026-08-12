/**
 * Seed question bank content. Each raw entry is expanded by seed.ts into a
 * full Question record with signals, IRT stats, and lifecycle status.
 */

import type { Difficulty, QuestionStatus } from './types';

export interface RawQuestion {
  subtopicId: string;
  subtopicIdFallback?: string;
  descriptionId: string;
  stem: string;
  options: string[];
  correct: number;
  facultyDifficulty: Difficulty;
  cognitive: string;
  explanation: string;
  reference: string;
  status: QuestionStatus;
  aiDifficulty: Difficulty;
  irtB?: number | null;
  irtA?: number | null;
  attempts?: number;
  authorId?: string;
  reviewRemark?: string;
}

export const RAW_QUESTIONS: RawQuestion[] = [
  {
    subtopicId: 'st-heat-transfer', descriptionId: 'd-conduction',
    stem: 'A metal rod and a wooden rod of identical dimensions are held at one end while the other end rests in boiling water. Why does the metal rod become uncomfortable to hold much sooner than the wooden rod?',
    options: [
      'Metal has a higher specific heat capacity than wood',
      'Metal is a better conductor of heat than wood',
      'Wood reflects thermal radiation more effectively',
      'The wooden rod loses heat faster by convection',
    ],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Recall',
    explanation: 'Metals contain free electrons that transfer kinetic energy rapidly through the lattice, giving them far higher thermal conductivity than insulators such as wood.',
    reference: 'Halliday & Resnick, Physics, 10th ed., §18.6',
    status: 'in_bank', irtB: -1.3, irtA: 1.4, aiDifficulty: 'Easy', attempts: 412,
  },
  {
    subtopicId: 'st-heat-transfer', descriptionId: 'd-convection',
    stem: 'In a domestic hot-water radiator, warm water enters at the top and cool water exits at the bottom. Which mechanism is primarily responsible for distributing heat into the surrounding room air?',
    options: [
      'Conduction through the radiator wall only',
      'Natural convection currents in the air',
      'Thermal radiation exclusively',
      'Forced convection driven by the water pump',
    ],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'Air in contact with the hot radiator warms, expands, becomes less dense and rises, drawing cooler air in behind it. This natural convection loop distributes heat around the room.',
    reference: 'Serway, Physics for Scientists and Engineers, 9th ed., Ch. 20',
    status: 'in_bank', irtB: 0.2, irtA: 1.1, aiDifficulty: 'Medium', attempts: 356,
  },
  {
    subtopicId: 'st-newton', descriptionId: 'd-second-law',
    stem: 'A 2 kg block is pushed across a frictionless surface by a constant horizontal force of 10 N. Except for the value of the acceleration, which statement is NOT true after 3 seconds of motion?',
    options: [
      'The acceleration is 5 m/s²',
      'The velocity is 15 m/s',
      'The net force remains 10 N',
      'The kinetic energy is unchanged from the start',
    ],
    correct: 3, facultyDifficulty: 'Medium', cognitive: 'Analysis',
    explanation: 'By F = ma, a = 5 m/s²; after 3 s, v = 15 m/s and KE has clearly increased from zero. The claim that kinetic energy is unchanged is the false statement.',
    reference: 'Halliday & Resnick, Physics, 10th ed., §5.2',
    status: 'in_bank', irtB: 0.9, irtA: 1.6, aiDifficulty: 'Hard', attempts: 289,
  },
  {
    subtopicId: 'st-free-fall', descriptionId: 'd-motion-gravity',
    stem: 'An object is dropped from rest from a height of 45 m. Ignoring air resistance and taking g = 10 m/s², how long does it take to reach the ground?',
    options: ['1.5 s', '3 s', '4.5 s', '9 s'],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Application',
    explanation: 'Using h = ½gt², 45 = ½·10·t², so t² = 9 and t = 3 s.',
    reference: 'Serway, Physics for Scientists and Engineers, 9th ed., §2.7',
    status: 'in_bank', irtB: -0.7, irtA: 1.3, aiDifficulty: 'Easy', attempts: 501,
  },
  {
    subtopicId: 'st-newton', descriptionId: 'd-friction',
    stem: 'A box remains stationary on an inclined plane despite gravity acting on it. As the angle of inclination is slowly increased, the box eventually begins to slide. At the instant sliding begins, which quantity has reached its maximum value?',
    options: [
      'The normal force from the surface',
      'The coefficient of kinetic friction',
      'The static friction force',
      'The gravitational potential energy',
    ],
    correct: 2, facultyDifficulty: 'Hard', cognitive: 'Analysis',
    explanation: 'Static friction rises to match the component of gravity along the incline until it reaches its maximum (μs·N). At that angle, motion is imminent, which defines the angle of repose.',
    reference: 'Halliday & Resnick, Physics, 10th ed., §6.1',
    status: 'in_bank', irtB: 1.5, irtA: 1.8, aiDifficulty: 'Hard', attempts: 198,
  },
  {
    subtopicId: 'st-cell-structure', descriptionId: 'd-organelles',
    stem: 'A cell is observed to have an unusually large number of mitochondria. Which functional characteristic is this cell MOST likely to exhibit?',
    options: [
      'High rate of protein secretion',
      'High energy (ATP) demand',
      'Extensive lipid storage',
      'Rapid cell division',
    ],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Application',
    explanation: 'Mitochondria are the primary site of ATP production via oxidative phosphorylation. Cells with high energy demands, such as cardiac muscle, are densely packed with them.',
    reference: 'Alberts, Molecular Biology of the Cell, 6th ed., Ch. 14',
    status: 'in_bank', irtB: -1.1, irtA: 1.2, aiDifficulty: 'Easy', attempts: 445,
  },
  {
    subtopicId: 'st-cell-structure', descriptionId: 'd-membrane',
    stem: 'A red blood cell is placed in a hypotonic solution. Which of the following best describes what happens and why?',
    options: [
      'It shrinks because water moves out of the cell',
      'It swells and may burst because water moves into the cell',
      'It remains unchanged because the membrane is impermeable to water',
      'It swells because solutes move into the cell',
    ],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'In a hypotonic solution the external solute concentration is lower, so water moves into the cell by osmosis down its concentration gradient, causing it to swell and potentially undergo haemolysis.',
    reference: 'Guyton & Hall, Textbook of Medical Physiology, 13th ed., Ch. 4',
    status: 'in_bank', irtB: 0.1, irtA: 1.0, aiDifficulty: 'Medium', attempts: 378,
  },
  {
    subtopicId: 'st-circulatory', descriptionId: 'd-cardiac-cycle',
    stem: 'During which phase of the cardiac cycle are both the atrioventricular valves and the semilunar valves closed simultaneously?',
    options: [
      'Ventricular ejection',
      'Isovolumetric contraction',
      'Rapid ventricular filling',
      'Atrial systole',
    ],
    correct: 1, facultyDifficulty: 'Hard', cognitive: 'Analysis',
    explanation: 'During isovolumetric contraction the ventricles contract with all four valves closed, so pressure rises but volume is constant, until ventricular pressure exceeds arterial pressure and the semilunar valves open.',
    reference: 'Guyton & Hall, Textbook of Medical Physiology, 13th ed., Ch. 9',
    status: 'in_bank', irtB: 1.7, irtA: 1.5, aiDifficulty: 'Hard', attempts: 156,
  },
  {
    subtopicId: 'st-renal', descriptionId: 'd-nephron',
    stem: 'Which segment of the nephron is primarily responsible for establishing the medullary concentration gradient that enables the production of concentrated urine?',
    options: [
      'Proximal convoluted tubule',
      'Loop of Henle',
      'Distal convoluted tubule',
      'Collecting duct',
    ],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Recall',
    explanation: 'The countercurrent multiplier of the loop of Henle establishes the hyperosmotic medullary gradient. The collecting duct then uses this gradient (under ADH control) to concentrate urine.',
    reference: 'Guyton & Hall, Textbook of Medical Physiology, 13th ed., Ch. 28',
    status: 'in_bank', irtB: 0.4, irtA: 0.4, aiDifficulty: 'Medium', attempts: 210,
  },
  {
    subtopicId: 'st-bonds', descriptionId: 'd-electronegativity',
    stem: 'Two atoms with electronegativity values of 3.5 and 0.9 form a bond. Based on the electronegativity difference, what type of bond is MOST likely formed?',
    options: ['Non-polar covalent', 'Polar covalent', 'Ionic', 'Metallic'],
    correct: 2, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'An electronegativity difference of 2.6 exceeds the ~1.7 threshold, so the bond is predominantly ionic: electrons are effectively transferred rather than shared.',
    reference: 'Zumdahl, Chemistry, 9th ed., Ch. 8',
    status: 'in_bank', irtB: 0.0, irtA: 1.1, aiDifficulty: 'Medium', attempts: 267,
  },
  {
    subtopicId: 'st-mole', descriptionId: 'd-molar-calc',
    stem: 'How many moles are present in 36 g of water (H₂O)? Take molar masses as H = 1 g/mol and O = 16 g/mol.',
    options: ['1 mol', '2 mol', '18 mol', '36 mol'],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Application',
    explanation: 'The molar mass of water is 2(1) + 16 = 18 g/mol. Moles = mass / molar mass = 36 / 18 = 2 mol.',
    reference: 'Zumdahl, Chemistry, 9th ed., Ch. 3',
    status: 'in_bank', irtB: -0.9, irtA: 1.4, aiDifficulty: 'Easy', attempts: 489,
  },
  {
    subtopicId: 'st-tenses', descriptionId: 'd-verb-tense',
    stem: 'Choose the sentence that uses the past perfect tense correctly.',
    options: [
      'By the time the ambulance arrived, the patient had already stabilised.',
      'By the time the ambulance arrived, the patient has already stabilised.',
      'By the time the ambulance arrives, the patient had already stabilised.',
      'By the time the ambulance arrived, the patient stabilise already.',
    ],
    correct: 0, facultyDifficulty: 'Medium', cognitive: 'Recall',
    explanation: 'The past perfect (had + past participle) describes an action completed before another past action. The stabilising happened before the ambulance arrived.',
    reference: 'Murphy, English Grammar in Use, 5th ed., Unit 15',
    status: 'in_bank', irtB: -0.3, irtA: 0.9, aiDifficulty: 'Medium', attempts: 334,
  },
  {
    subtopicId: 'st-reading', descriptionId: 'd-inference',
    stem: 'A passage states: "Despite the committee\'s public optimism, the minutes revealed persistent concern about the trial\'s funding." What can be inferred about the committee?',
    options: [
      'The committee was united in its confidence',
      "The committee's private views differed from its public stance",
      'The trial had already lost its funding',
      'The committee opposed the trial entirely',
    ],
    correct: 1, facultyDifficulty: 'Hard', cognitive: 'Analysis',
    explanation: 'The contrast between "public optimism" and documented "persistent concern" implies a gap between what the committee said publicly and what it privately believed.',
    reference: 'Cambridge English Skills: Reading, Unit 7',
    status: 'in_bank', irtB: 1.2, irtA: 1.7, aiDifficulty: 'Hard', attempts: 178,
  },
  {
    subtopicId: 'st-thermal-exp', descriptionId: 'd-linear-exp',
    stem: 'A steel bridge span is 100 m long at 10 °C. If the linear expansion coefficient of steel is 1.2 × 10⁻⁵ /°C, approximately how much does it lengthen when the temperature rises to 40 °C?',
    options: ['0.36 cm', '3.6 cm', '36 cm', '0.036 cm'],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'ΔL = αL₀ΔT = 1.2×10⁻⁵ × 100 × 30 = 0.036 m = 3.6 cm.',
    reference: 'Serway, Physics for Scientists and Engineers, 9th ed., §19.4',
    status: 'in_bank', irtB: 0.3, irtA: 1.2, aiDifficulty: 'Medium', attempts: 42,
  },
  {
    subtopicId: 'st-projectile', descriptionId: 'd-trajectory',
    stem: 'A projectile is launched at 30° above the horizontal. Neglecting air resistance, at the highest point of its trajectory, which statement about its velocity is correct?',
    options: [
      'Its velocity is zero',
      'Only the vertical component of velocity is zero',
      'Only the horizontal component of velocity is zero',
      'Both components of velocity are zero',
    ],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Analysis',
    explanation: 'At the apex the vertical velocity momentarily becomes zero, but the horizontal component is unchanged throughout the flight (no horizontal acceleration).',
    reference: 'Halliday & Resnick, Physics, 10th ed., §4.5',
    status: 'in_bank', irtB: null, irtA: null, aiDifficulty: 'Hard', attempts: 0,
  },
  {
    subtopicId: 'st-bonds', descriptionId: 'd-bond-types',
    stem: 'Which of the following compounds is held together predominantly by covalent bonding?',
    options: ['Sodium chloride (NaCl)', 'Magnesium oxide (MgO)', 'Methane (CH₄)', 'Potassium bromide (KBr)'],
    correct: 2, facultyDifficulty: 'Easy', cognitive: 'Recall',
    explanation: 'Methane consists of a non-metal (carbon) bonded to non-metals (hydrogen) with small electronegativity differences, giving covalent bonds. The others are ionic compounds formed between a metal and a non-metal.',
    reference: 'Zumdahl, Chemistry, 9th ed., Ch. 8',
    status: 'in_bank', irtB: null, irtA: null, aiDifficulty: 'Easy', attempts: 0,
  },
  {
    subtopicId: 'st-renal', descriptionId: 'd-nephron',
    stem: 'The glomerular filtration rate (GFR) in a healthy adult is approximately which of the following?',
    options: ['12 mL/min', '125 mL/min', '1250 mL/min', '12,500 mL/min'],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Recall',
    explanation: 'Normal GFR is about 125 mL/min, or roughly 180 L/day. This item has shown anomalous response patterns and is under review.',
    reference: 'Guyton & Hall, Textbook of Medical Physiology, 13th ed., Ch. 27',
    status: 'in_bank', irtB: 0.5, irtA: -0.3, aiDifficulty: 'Medium', attempts: 134,
  },
];

/** Questions currently moving through the authoring/review workflow. */
export const WORKFLOW_QUESTIONS: RawQuestion[] = [
  {
    subtopicId: 'st-heat-transfer', descriptionId: 'd-radiation',
    stem: "Two identical containers of hot water are placed in a cool room, one painted matte black, the other polished silver. After 30 minutes, which container's water is cooler, and by which dominant mechanism?",
    options: [
      'The silver one, by conduction',
      'The black one, by radiation',
      'Both equally, radiation is colour-independent',
      'The silver one, by convection',
    ],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'Matte black surfaces are excellent thermal radiators (high emissivity), so the black container loses heat faster by radiation and its water is cooler.',
    reference: 'Serway, Physics for Scientists and Engineers, 9th ed., §20.7',
    status: 'under_med_edu_review', authorId: 'u-faculty-2', aiDifficulty: 'Medium',
  },
  {
    subtopicId: 'st-second-law', descriptionId: 'd-second-law',
    subtopicIdFallback: 'st-newton',
    stem: 'A 1500 kg car accelerates uniformly from rest to 20 m/s in 8 seconds on a level road. Assuming negligible resistive forces, what is the magnitude of the net driving force?',
    options: ['1875 N', '3000 N', '3750 N', '30000 N'],
    correct: 2, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'a = Δv/Δt = 20/8 = 2.5 m/s²; F = ma = 1500 × 2.5 = 3750 N.',
    reference: 'Halliday & Resnick, Physics, 10th ed., §5.2',
    status: 'correction_required', authorId: 'u-faculty-1', aiDifficulty: 'Medium',
    reviewRemark: 'Please clarify whether the road is level and confirm resistive forces are neglected. Otherwise the intended answer is ambiguous. Revise the stem and resubmit.',
  },
  {
    subtopicId: 'st-mole', descriptionId: 'd-molar-calc',
    stem: 'What mass of sodium hydroxide (NaOH, molar mass 40 g/mol) is required to prepare 500 mL of a 2 mol/L solution?',
    options: ['20 g', '40 g', '80 g', '4 g'],
    correct: 1, facultyDifficulty: 'Medium', cognitive: 'Application',
    explanation: 'Moles required = 2 mol/L × 0.5 L = 1 mol; mass = 1 × 40 = 40 g.',
    reference: 'Zumdahl, Chemistry, 9th ed., Ch. 4',
    status: 'under_departmental_review', authorId: 'u-faculty-2', aiDifficulty: 'Medium',
  },
  {
    subtopicId: 'st-cell-structure', descriptionId: 'd-organelles',
    stem: 'Which organelle is responsible for the post-translational modification, sorting, and packaging of proteins for secretion?',
    options: ['Rough endoplasmic reticulum', 'Golgi apparatus', 'Lysosome', 'Peroxisome'],
    correct: 1, facultyDifficulty: 'Easy', cognitive: 'Recall',
    explanation: 'The Golgi apparatus modifies, sorts and packages proteins received from the rough ER into vesicles destined for secretion or other organelles.',
    reference: 'Alberts, Molecular Biology of the Cell, 6th ed., Ch. 13',
    status: 'submitted', authorId: 'u-faculty-1', aiDifficulty: 'Easy',
  },
  {
    subtopicId: 'st-tenses', descriptionId: 'd-verb-tense',
    stem: 'Identify the sentence with correct subject-verb agreement.',
    options: [
      'Neither the physician nor the nurses was available.',
      'Neither the physician nor the nurses were available.',
      'Neither the physician nor the nurses is available.',
      'Neither the physicians nor the nurse were available.',
    ],
    correct: 1, facultyDifficulty: 'Hard', cognitive: 'Analysis',
    explanation: 'With "neither…nor", the verb agrees with the nearer subject. "Nurses" (plural) is nearest, so "were" is correct.',
    reference: 'Murphy, English Grammar in Use, 5th ed., Unit 79',
    status: 'draft', authorId: 'u-faculty-1', aiDifficulty: 'Hard',
  },
];
