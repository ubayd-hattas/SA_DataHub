declare module 'react-scrollama' {
  import * as React from 'react'

  export interface ScrollamaProps {
    children: React.ReactNode
    onStepEnter?: (response: { data: any; element: HTMLElement; direction: 'up' | 'down' }) => void
    onStepExit?: (response: { data: any; element: HTMLElement; direction: 'up' | 'down' }) => void
    onStepProgress?: (response: { data: any; element: HTMLElement; progress: number }) => void
    offset?: number | string
    debug?: boolean
  }

  export const Scrollama: React.FC<ScrollamaProps>

  export interface StepProps {
    children: React.ReactNode
    data: any
  }

  export const Step: React.FC<StepProps>
}
