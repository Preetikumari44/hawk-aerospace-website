import { FlagIcon } from "@/components/career/ui/FlagIcon";
import type { FaqItem } from "@/lib/career/types";
import type { FlagCode } from "@/lib/career/types";

const countries: Array<[FlagCode, string]> = [
  ["ee", "Estonia"], ["fr", "France"], ["de", "Germany"], ["ie", "Ireland"],
  ["nl", "Netherlands"], ["es", "Spain"], ["gb", "United Kingdom"],
];

/** All 15 existing FAQ questions and answers, wording unchanged from the original page. */
export const faqItems: FaqItem[] = [
  { id: 1, question: "What is Fly-to-Europe\u2122?", answer: (<>
    <p>Fly-to-Europe&trade; is a pathway for drone pilots and students who want to work and settle in Europe.</p>
    <p><strong>We help you:</strong></p>
    <ul><li>Get EU-standard drone training</li><li>Secure work assignments with European agriculture &amp; drone service companies</li><li>Receive work visa and relocation support</li><li>Earn through Fly-to-Own&trade; and Guaranteed Earnings</li></ul></>) },
  { id: 2, question: "Who can apply?", answer: (<>
    <p>You can apply if you meet the following criteria:</p>
    <ul><li>Aged between 21&ndash;55 years</li><li>English proficiency (IELTS 5.5+ recommended)</li><li>Interest in drones, technology, or precision farming</li><li>Willingness to relocate and work in Europe</li></ul></>) },
  { id: 3, question: "I\u2019m a fresher with no drone experience \u2014 can I join?", answer: (<>
    <p>Yes! Our <strong>Fresher Pilot Offer</strong> is designed for beginners.</p>
    <p>You will:</p>
    <ul><li>Receive drone pilot certification training</li><li>Get a guaranteed stipend of up to &euro;1000/month during training</li></ul></>) },
  { id: 4, question: "What if I already have a drone license?", answer: (<>
    <p>Perfect! You will be placed in the <strong>Professional Operator Track</strong>.</p>
    <p>You&rsquo;ll complete a short <strong>EASA/CAA conversion course</strong> to qualify for European missions.</p></>) },
  { id: 5, question: "How much can I earn in Europe as a drone operator?", answer: (<>
    <p>Earnings vary by skill and mission type:</p>
    <p><strong>Typical Salary Range:</strong></p>
    <ul><li>Agriculture Operations: &euro;2,500&ndash;&euro;3,000/month</li><li>Surveying &amp; Inspection: &euro;3,000&ndash;&euro;4,000/month</li><li>Crop Analysis &amp; Spraying: &euro;2,000&ndash;&euro;2,800/month</li></ul>
    <p>Experienced EASA-certified pilots can earn more.</p></>) },
  { id: 6, question: "Is there a guaranteed income while training?", answer: (<>
    <p>Yes. Through our <strong>Guaranteed Earnings Plan</strong>, you get a stipend of up to &euro;1000/month during training with partner projects.</p></>) },
  { id: 7, question: "Do you provide visa assistance for Europe?", answer: (<>
    <p>Yes &mdash; full support is included.</p>
    <p>We assist with:</p>
    <ul><li>Work assignment letters</li><li>Visa documentation &amp; processing</li><li>Travel &amp; relocation arrangements</li></ul>
    <p>All placements follow EASA/CAA rules &amp; immigration compliance.</p></>) },
  { id: 8, question: "Which European countries are included?", answer: (<>
    <p>Our partner network currently includes:</p>
    <ul className="!ml-0 grid list-none grid-cols-[repeat(auto-fit,minmax(170px,1fr))] !gap-2">
      {countries.map(([code, name]) => (
        <li key={code} className="flex items-center gap-2.5"><FlagIcon code={code} className="h-[18px] w-6 rounded-[3px] shadow-sm" /> {name}</li>
      ))}
    </ul>
    <p>More countries will open through 2026.</p></>) },
  { id: 9, question: "What is the Fly-to-Own\u2122 option?", answer: (<>
    <p>Fly-to-Own&trade; (Buy Now, Pay Later) lets you receive a financed drone with <strong>no upfront cost</strong>.</p>
    <p>Your drone becomes fully yours after <strong>12&ndash;24 months</strong> of active flight work.</p>
    <p><em>*Loans subject to finance approval.</em></p></>) },
  { id: 10, question: "What support do you provide after reaching Europe?", answer: (<>
    <p>We provide:</p>
    <ul><li>Local onboarding &amp; EASA/CAA compliance</li><li>Community of Indian drone pilots in Europe</li><li>Career growth &amp; upskilling support</li><li>Visa renewal &amp; settlement guidance</li></ul></>) },
  { id: 11, question: "How long does the entire process take?", answer: (<>
    <p><strong>Typical timeline:</strong></p>
    <ul><li>Training: 1&ndash;3 months (depends on your location)</li><li>Placement &amp; visa: 2&ndash;6 months</li><li>Full relocation: 3&ndash;9 months</li></ul></>) },
  { id: 12, question: "Are there any upfront costs or hidden fees?", answer: (<>
    <p>No hidden charges.</p>
    <p>However, you must cover:</p>
    <ul><li>Application/registration fees</li><li>Visa and travel costs</li><li>EASA/CAA training &amp; insurance costs</li><li>Optional drone financing via Fly Now Pay Later</li></ul></>) },
  { id: 13, question: "What kind of work will I do in Europe?", answer: (<>
    <p>Your assignments may include:</p>
    <ul><li>Agricultural spraying &amp; seeding</li><li>Crop mapping &amp; NDVI analysis</li><li>Solar panel inspections</li><li>Land surveying &amp; environmental monitoring</li><li>Infrastructure inspection (bridges, pipelines, etc.)</li></ul></>) },
  { id: 14, question: "What certifications do I need?", answer: (<>
    <p>You&rsquo;ll need:</p>
    <ul><li>EASA or CAA (UK) conversion certificate</li><li>Basic English proficiency (for visa)</li></ul></>) },
  { id: 15, question: "Can I settle permanently in Europe after this programme?", answer: (<>
    <p>Yes &mdash; many operators move to long-term work permits or PR after <strong>2&ndash;3 years</strong> depending on the country.</p>
    <p>We assist with guidance throughout your journey.</p></>) },
];
