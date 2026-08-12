/**
 * Academic hierarchy: Subject → Topic → Subtopic → Description.
 * The foundation of the Table of Specification.
 */

import type { Taxonomy } from './types';

interface RawDescription { id: string; text: string }
interface RawSubtopic { id: string; name: string; code: string; descriptions: RawDescription[] }
interface RawTopic { id: string; name: string; code: string; subtopics: RawSubtopic[] }
interface RawSubject { id: string; name: string; code: string; topics: RawTopic[] }

const TREE: RawSubject[] = [
  {
    id: 'sub-phy', name: 'Physics', code: 'PHY',
    topics: [
      {
        id: 'top-heat', name: 'Heat', code: 'PHY-01',
        subtopics: [
          {
            id: 'st-heat-transfer', name: 'Heat Transfer', code: 'PHY-01-01',
            descriptions: [
              { id: 'd-conduction', text: 'Conduction' },
              { id: 'd-convection', text: 'Convection' },
              { id: 'd-radiation', text: 'Radiation' },
            ],
          },
          {
            id: 'st-thermal-exp', name: 'Thermal Expansion', code: 'PHY-01-02',
            descriptions: [{ id: 'd-linear-exp', text: 'Linear expansion of solids' }],
          },
        ],
      },
      {
        id: 'top-kinematics', name: 'Kinematics', code: 'PHY-02',
        subtopics: [
          {
            id: 'st-free-fall', name: 'Free Fall', code: 'PHY-02-01',
            descriptions: [{ id: 'd-motion-gravity', text: 'Equations of motion under gravity' }],
          },
          {
            id: 'st-projectile', name: 'Projectile Motion', code: 'PHY-02-02',
            descriptions: [{ id: 'd-trajectory', text: 'Trajectory analysis' }],
          },
        ],
      },
      {
        id: 'top-dynamics', name: 'Dynamics', code: 'PHY-03',
        subtopics: [
          {
            id: 'st-newton', name: "Newton's Laws", code: 'PHY-03-01',
            descriptions: [
              { id: 'd-second-law', text: "Newton's Second Law" },
              { id: 'd-friction', text: 'Friction' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sub-bio', name: 'Biology', code: 'BIO',
    topics: [
      {
        id: 'top-cell', name: 'Cell Biology', code: 'BIO-01',
        subtopics: [
          {
            id: 'st-cell-structure', name: 'Cell Structure', code: 'BIO-01-01',
            descriptions: [
              { id: 'd-organelles', text: 'Organelles and their functions' },
              { id: 'd-membrane', text: 'Cell membrane transport' },
            ],
          },
        ],
      },
      {
        id: 'top-physiology', name: 'Human Physiology', code: 'BIO-02',
        subtopics: [
          {
            id: 'st-circulatory', name: 'Circulatory System', code: 'BIO-02-01',
            descriptions: [{ id: 'd-cardiac-cycle', text: 'The cardiac cycle' }],
          },
          {
            id: 'st-renal', name: 'Renal System', code: 'BIO-02-02',
            descriptions: [{ id: 'd-nephron', text: 'Nephron structure and function' }],
          },
        ],
      },
    ],
  },
  {
    id: 'sub-chem', name: 'Chemistry', code: 'CHM',
    topics: [
      {
        id: 'top-bonding', name: 'Chemical Bonding', code: 'CHM-01',
        subtopics: [
          {
            id: 'st-bonds', name: 'Ionic & Covalent Bonds', code: 'CHM-01-01',
            descriptions: [
              { id: 'd-electronegativity', text: 'Electronegativity' },
              { id: 'd-bond-types', text: 'Identifying bond types' },
            ],
          },
        ],
      },
      {
        id: 'top-stoich', name: 'Stoichiometry', code: 'CHM-02',
        subtopics: [
          {
            id: 'st-mole', name: 'Mole Concept', code: 'CHM-02-01',
            descriptions: [{ id: 'd-molar-calc', text: 'Molar mass calculations' }],
          },
        ],
      },
    ],
  },
  {
    id: 'sub-eng', name: 'English', code: 'ENG',
    topics: [
      {
        id: 'top-grammar', name: 'Grammar', code: 'ENG-01',
        subtopics: [
          {
            id: 'st-tenses', name: 'Tenses', code: 'ENG-01-01',
            descriptions: [{ id: 'd-verb-tense', text: 'Correct verb tense usage' }],
          },
        ],
      },
      {
        id: 'top-comprehension', name: 'Comprehension', code: 'ENG-02',
        subtopics: [
          {
            id: 'st-reading', name: 'Reading Comprehension', code: 'ENG-02-01',
            descriptions: [{ id: 'd-inference', text: 'Drawing inferences from text' }],
          },
        ],
      },
    ],
  },
];

export function buildTaxonomy(): Taxonomy {
  const subjects: Taxonomy['subjects'] = [];
  const topics: Taxonomy['topics'] = [];
  const subtopics: Taxonomy['subtopics'] = [];
  const descriptions: Taxonomy['descriptions'] = [];
  for (const s of TREE) {
    subjects.push({ id: s.id, name: s.name, code: s.code });
    for (const t of s.topics) {
      topics.push({ id: t.id, subjectId: s.id, name: t.name, code: t.code });
      for (const st of t.subtopics) {
        subtopics.push({ id: st.id, topicId: t.id, subjectId: s.id, name: st.name, code: st.code });
        for (const d of st.descriptions) {
          descriptions.push({ id: d.id, subtopicId: st.id, text: d.text });
        }
      }
    }
  }
  return { subjects, topics, subtopics, descriptions };
}
