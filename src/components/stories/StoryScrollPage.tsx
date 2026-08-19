'use client'

/**
 * src/components/stories/StoryScrollPage.tsx
 *
 * The interactive client island for scroll stories.
 * Receives the story structure and pre-fetched stat objects from the server.
 * Uses react-scrollama to track which chapter is in view and updates the sticky chart.
 */

import { useState } from 'react'
import { Scrollama, Step } from 'react-scrollama'
import { StoryChapterText } from './StoryChapterText'
import { StoryVisualizationPanel } from './StoryVisualizationPanel'
import { StoryStatCallout } from './StoryStatCallout'
import type { ScrollStory } from '@/types/scroll-story'
import type { Statistic } from '@/types'

interface StoryScrollPageProps {
  story: ScrollStory
  stats: Statistic[]
}

export function StoryScrollPage({ story, stats }: StoryScrollPageProps) {
  // Convert pre-fetched stats array into a quick-lookup map
  const statMap = new Map(stats.map((s) => [s.id, s]))

  // Track the active chapter ID (default to first chapter)
  const [activeChapterId, setActiveChapterId] = useState<string>(
    story.chapters[0]?.id ?? ''
  )

  // Find the active visualization config based on the active chapter
  const activeChapter = story.chapters.find((c) => c.id === activeChapterId)
  const activeVis = activeChapter?.visualization
  const activeStat = activeVis ? statMap.get(activeVis.statId) : undefined

  const onStepEnter = ({ data }: { data: string }) => {
    setActiveChapterId(data)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-14">

        {/* Left Column: Scrolling Chapters */}
        <div className="w-full lg:w-[55%]">
          <Scrollama onStepEnter={onStepEnter} offset={0.45}>
            {story.chapters.map((chapter, i) => {
              const isActive = chapter.id === activeChapterId

              const mobileVisStat = chapter.visualization?.statId
                ? statMap.get(chapter.visualization.statId)
                : undefined

              const calloutStat = chapter.statCalloutId
                ? statMap.get(chapter.statCalloutId)
                : undefined

              return (
                <Step data={chapter.id} key={chapter.id}>
                  <div className="mb-24 lg:mb-52 last:mb-32">
                    <StoryChapterText
                      chapter={chapter}
                      isActive={isActive}
                      statMap={statMap}
                      index={i}
                    />

                    {/* Inline Stat Callout */}
                    {calloutStat && (
                      <StoryStatCallout stat={calloutStat} className="mt-5 lg:mt-6" />
                    )}

                    {/* Mobile inline visualization (hidden on lg and above) */}
                    {chapter.visualization && mobileVisStat && (
                      <div className="mt-6 block lg:hidden">
                        <StoryVisualizationPanel
                          config={chapter.visualization}
                          stat={mobileVisStat}
                        />
                      </div>
                    )}
                  </div>
                </Step>
              )
            })}
          </Scrollama>
        </div>

        {/* Right Column: Sticky Visualization (hidden on mobile) */}
        <div className="hidden lg:block lg:w-[45%]">
          <div className="sticky top-24 min-h-[320px]">
            {activeVis && activeStat ? (
              <StoryVisualizationPanel
                config={activeVis}
                stat={activeStat}
                key={`${activeStat.id}-${activeVis.highlightPeriod ?? 'none'}`}
              />
            ) : (
              <div
                className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20"
                role="img"
                aria-label="No visualization for this chapter"
              >
                <p className="text-sm text-slate-400">No chart for this chapter</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
