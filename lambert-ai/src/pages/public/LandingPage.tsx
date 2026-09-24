import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function LandingPage() {
  return (
    <div>
      <Hero />
      <HowItWorks />
      <AiTutorSection />
      <AiModelsSection />
      <StudyMaterialsSection />
      <PastPaperSection />
      <QuizEngineSection />
      <StudyPlannerSection />
      <AnalyticsSection />
      <EnvEngineeringSection />
      <VoiceSection />
      <SubjectsSection />
      <FaqSection />
      <FinalCta />
    </div>
  )
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  tone = 'paper',
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
  tone?: 'paper' | 'ink'
}) {
  return (
    <section id={id} className={tone === 'ink' ? 'bg-ink-950 text-white' : ''}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className={tone === 'ink' ? 'text-sm font-medium text-gold-500' : 'text-sm font-medium text-gold-600'}>
              {eyebrow}
            </p>
          )}
          <h2 className={tone === 'ink' ? 'mt-2 text-3xl text-white' : 'mt-2 text-3xl'}>{title}</h2>
          {description && (
            <p className={tone === 'ink' ? 'mt-3 text-ink-300' : 'mt-3 text-ink-500'}>{description}</p>
          )}
        </div>
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  )
}

function Hero() {
  return (
    <section className="border-b border-ink-300/25">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
        <div>
          <Badge tone="gold">Your Intelligent Study Companion</Badge>
          <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
            Learn smarter with an AI tutor built for how students actually study.
          </h1>
          <p className="mt-5 max-w-lg text-base text-ink-500">
            Learn smarter, understand difficult concepts, practice effectively, and build better study habits
            with AI. Ask questions, work through problems step by step, and turn your own notes and past papers
            into a personalized study plan — in English or Kiswahili.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" fullWidth>Start learning</Button>
            </Link>
            <Link to="/tutor">
              <Button size="lg" variant="outline" fullWidth>Ask Lambert AI</Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-500">
            <span>English &amp; Kiswahili</span>
            <span>Voice interaction</span>
            <span>Past paper analysis</span>
          </div>
        </div>
        <div className="rounded-lg border border-ink-300/30 bg-paper-0 p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-ink-300/20 pb-3">
            <span className="h-7 w-7 rounded-md bg-ink-900" />
            <p className="text-sm font-medium text-ink-700">Tutor · Environmental Engineering</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <p className="ml-auto max-w-[80%] rounded-lg rounded-tr-sm bg-paper-100 px-3.5 py-2.5 text-ink-900">
              Why do we use coagulation before sedimentation in water treatment?
            </p>
            <p className="max-w-[85%] rounded-lg rounded-tl-sm bg-ink-900 px-3.5 py-2.5 text-white">
              Coagulation neutralizes the charge on suspended particles so they can clump into larger flocs.
              Those flocs settle far faster in the sedimentation tank than the fine particles would on their own —
              want to see the Jar Test method used to find the right dose?
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Ask a question', body: 'Type, speak, or upload a document — Lambert AI meets you where you are.' },
    { n: '2', title: 'Understand the concept', body: 'Get a step-by-step explanation tailored to your level, with worked examples.' },
    { n: '3', title: 'Practice deliberately', body: 'Turn the topic into a quiz or add it to your study plan.' },
    { n: '4', title: 'Track and improve', body: 'See which topics need more work and get recommended what to study next.' },
  ]
  return (
    <Section id="how-it-works" eyebrow="How it works" title="From question to mastery, in one place">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n}>
            <span className="font-serif text-2xl text-gold-600">{s.n}</span>
            <p className="mt-2 font-semibold text-ink-950">{s.title}</p>
            <p className="mt-1 text-sm text-ink-500">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function AiTutorSection() {
  const modes = ['Tutor', 'Exam', 'Homework Helper', 'Quiz Me', 'Explain Simply', 'Deep Learning', 'Revision', 'Document Tutor', 'Engineering Tutor']
  return (
    <section id="ai-tutor" className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div className="max-w-md">
            <p className="text-sm font-medium text-gold-600">AI Tutor</p>
            <h2 className="mt-2 text-3xl">One tutor, nine ways to learn</h2>
            <p className="mt-3 text-ink-500">
              Switch modes depending on what you need — a patient explanation, exam-style practice, or a
              document-aware tutor that answers directly from your own notes and past papers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {modes.map((m) => (
              <Badge key={m} tone="neutral" className="px-3 py-1.5 text-sm">{m}</Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AiModelsSection() {
  const providers = ['LAMBERT Auto', 'OpenAI', 'Microsoft', 'Google Gemini', 'Anthropic Claude']
  return (
    <Section
      eyebrow="Multiple AI models"
      title="LAMBERT Auto picks the right model for the job"
      description="Lambert AI routes each question to the model best suited to it by default. If you prefer, choose a specific provider yourself — every option is configured and secured on the backend, never in your browser."
    >
      <div className="flex flex-wrap gap-3">
        {providers.map((p) => (
          <div key={p} className="rounded-md border border-ink-300/30 bg-paper-0 px-4 py-2.5 text-sm font-medium text-ink-700">
            {p}
          </div>
        ))}
      </div>
    </Section>
  )
}

function StudyMaterialsSection() {
  return (
    <section className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <p className="text-sm font-medium text-gold-600">Study materials</p>
        <h2 className="mt-2 max-w-xl text-3xl">Upload your notes. Ask questions about them directly.</h2>
        <p className="mt-3 max-w-xl text-ink-500">
          Bring your own PDFs, Word documents, and text notes. Lambert AI reads and indexes them, then answers
          your questions with citations back to the exact page they came from.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {['Upload', 'Processing & indexing', 'Ask with sources'].map((step, i) => (
            <div key={step} className="rounded-lg border border-ink-300/30 p-5">
              <p className="text-sm text-ink-500">Step {i + 1}</p>
              <p className="mt-1 font-semibold text-ink-950">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PastPaperSection() {
  return (
    <Section
      eyebrow="Past paper intelligence"
      title="Understand how a subject has actually been examined"
      description="Upload past papers and Lambert AI detects each question, tags its topic, year, and difficulty, and shows the patterns across years — so your revision is grounded in real exam history, not guesswork. This is historical analysis, not a prediction of future exam content."
    >
      <div className="overflow-hidden rounded-lg border border-ink-300/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-100 text-ink-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Question</th>
              <th className="px-4 py-2.5 font-medium">Year</th>
              <th className="px-4 py-2.5 font-medium">Topic</th>
              <th className="px-4 py-2.5 font-medium">Difficulty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/20 bg-paper-0">
            <tr>
              <td className="px-4 py-2.5">Explain the role of activated sludge in wastewater treatment</td>
              <td className="px-4 py-2.5">2023</td>
              <td className="px-4 py-2.5">Wastewater Treatment</td>
              <td className="px-4 py-2.5"><Badge tone="gold">Medium</Badge></td>
            </tr>
            <tr>
              <td className="px-4 py-2.5">Derive the continuity equation for open-channel flow</td>
              <td className="px-4 py-2.5">2022</td>
              <td className="px-4 py-2.5">Hydrology</td>
              <td className="px-4 py-2.5"><Badge tone="crimson">Hard</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function QuizEngineSection() {
  return (
    <section className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <p className="text-sm font-medium text-gold-600">Quiz engine</p>
        <h2 className="mt-2 max-w-xl text-3xl">Generate a quiz on exactly what you need to practice</h2>
        <p className="mt-3 max-w-xl text-ink-500">
          Choose a subject, topic, difficulty, and question type, then practice timed or untimed. Every result
          breaks performance down by topic, so you know exactly what to review next.
        </p>
      </div>
    </section>
  )
}

function StudyPlannerSection() {
  return (
    <Section
      eyebrow="Personalized study planner"
      title="A study plan that adapts to your exam date"
      description="Tell Lambert AI when your exam is and how many hours you can study each week. It builds a day-by-day plan, and updates it as you complete, reschedule, or skip sessions."
    />
  )
}

function AnalyticsSection() {
  return (
    <section className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <p className="text-sm font-medium text-gold-600">Learning analytics</p>
        <h2 className="mt-2 max-w-xl text-3xl">See exactly where you stand, subject by subject</h2>
        <p className="mt-3 max-w-xl text-ink-500">
          Track your study streak, time spent, quiz averages, and topic mastery — and let Lambert AI surface
          your weakest topics before they show up on an exam.
        </p>
      </div>
    </section>
  )
}

function EnvEngineeringSection() {
  const categories = [
    'Water Supply Engineering', 'Wastewater Treatment', 'Solid Waste Management', 'Air Pollution Control',
    'Environmental Chemistry', 'Hydrology', 'Water Quality', 'Environmental Impact Assessment',
    'Climate Change', 'Environmental Microbiology', 'Renewable Energy', 'GIS and Remote Sensing',
  ]
  return (
    <Section
      id="env-engineering"
      tone="ink"
      eyebrow="Specialized track"
      title="A dedicated Environmental Engineering tutor"
      description="Beyond general study support, Lambert AI includes a specialized Engineering Tutor mode covering the full breadth of environmental engineering coursework."
    >
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c} className="rounded-full border border-white/20 px-3.5 py-1.5 text-sm text-ink-300">
            {c}
          </span>
        ))}
      </div>
    </Section>
  )
}

function VoiceSection() {
  return (
    <section className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <p className="text-sm font-medium text-gold-600">Voice learning</p>
        <h2 className="mt-2 max-w-xl text-3xl">Talk through a problem when typing isn't convenient</h2>
        <p className="mt-3 max-w-xl text-ink-500">
          Ask a question by voice and hear Lambert AI's explanation read back to you — useful for revision on
          the move, or working through a problem hands-free.
        </p>
      </div>
    </section>
  )
}

function SubjectsSection() {
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Environmental Engineering', 'Computer Science', 'Economics', 'English Language']
  return (
    <Section id="subjects" eyebrow="Supported subjects" title="Study across the subjects that matter to you">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {subjects.map((s) => (
          <div key={s} className="rounded-lg border border-ink-300/30 bg-paper-0 px-4 py-4 text-sm font-medium text-ink-900">
            {s}
          </div>
        ))}
      </div>
    </Section>
  )
}

function FaqSection() {
  const faqs = [
    { q: 'Is Lambert AI free to use?', a: 'Lambert AI offers a free tier for core tutoring and quizzes, with expanded limits on paid plans.' },
    { q: 'Which languages are supported?', a: 'Lambert AI currently supports English and Kiswahili, with more languages planned.' },
    { q: 'Can Lambert AI predict my exam questions?', a: 'No. Past paper analysis shows historical patterns to guide revision — it does not predict future exam content.' },
    { q: 'Is my uploaded data private?', a: 'Your documents and conversations are only used to answer your questions. Review our privacy policy for full detail.' },
  ]
  return (
    <section id="faq" className="border-t border-ink-300/25 bg-paper-0">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="text-3xl">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-ink-300/20">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-ink-950">{f.q}</summary>
              <p className="mt-2 text-sm text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="border-t border-ink-300/25 bg-ink-950">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8 md:py-20">
        <h2 className="text-3xl text-white">Ready to study smarter?</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-300">
          Join Lambert AI and turn every question into a step toward understanding.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register">
            <Button size="lg">Start learning</Button>
          </Link>
          <Link to="/tutor">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Ask Lambert AI
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
