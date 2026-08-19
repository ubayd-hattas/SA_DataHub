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

  // Handle scrollama step enter
  const onStepEnter = ({ data }: { data: string }) => {
    setActiveChapterId(data)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
        
        {/* Left Column: Scrolling Chapters */}
        <div className="w-full lg:w-7/12 xl:w-1/2">
          <Scrollama onStepEnter={onStepEnter} offset={0.5}>
            {story.chapters.map((chapter, i) => {
              const isActive = chapter.id === activeChapterId

              // Mobile visualization (hidden on desktop)
              // We render it inside the Step so it flows naturally in the DOM on mobile
              const mobileVisStat = chapter.visualization?.statId
                ? statMap.get(chapter.visualization.statId)
                : undefined

              const calloutStat = chapter.statCalloutId
                ? statMap.get(chapter.statCalloutId)
                : undefined

              return (
                <Step data={chapter.id} key={chapter.id}>
                  {/* Step requires a single DOM element child */}
                  <div className="mb-24 lg:mb-48 last:mb-32">
                    <StoryChapterText
                      chapter={chapter}
                      isActive={isActive}
                      statMap={statMap}
                      index={i}
                    />

                    {/* Inline Stat Callout (if any) */}
                    {calloutStat && (
                      <StoryStatCallout stat={calloutStat} className="mt-6 lg:mt-8" />
                    )}

                    {/* Mobile inline visualization (hidden on lg and above) */}
                    {chapter.visualization && mobileVisStat && (
                      <div className="mt-8 block lg:hidden">
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
        <div className="hidden lg:sticky lg:top-24 lg:block lg:w-5/12 xl:w-1/2">
          {activeVis && activeStat ? (
            <StoryVisualizationPanel
              config={activeVis}
              stat={activeStat}
              // Add a key based on highlightPeriod to force a re-animation 
              // of the ReferenceLine if the stat stays the same but period changes
              key={`${activeStat.id}-${activeVis.highlightPeriod ?? 'none'}`}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900/20">
              No chart configured for this chapter
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
