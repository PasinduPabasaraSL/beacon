import { Audiences } from '@/sections/audiences'
import { Features } from '@/sections/features'
import { Footer } from '@/sections/footer'
import { Header } from '@/sections/header'
import { Hero } from '@/sections/hero'
import { HowItWorks } from '@/sections/how-it-works'
import { OpenSource } from '@/sections/open-source'
import { RecordBook } from '@/sections/record-book'
import { Tour } from '@/sections/tour'

export default function App() {
  return (
    <>
      <a
        href="#features"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <Header />
      <main>
        <Hero />
        <Features />
        <RecordBook />
        <HowItWorks />
        <Tour />
        <Audiences />
        <OpenSource />
      </main>
      <Footer />
    </>
  )
}
