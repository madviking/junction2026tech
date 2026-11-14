import { Tabs as MantineTabs } from '@mantine/core'
import type { ReactNode } from 'react'
import classes from './data.module.css'

export interface TabItem {
  value: string
  label: ReactNode
}

export interface TabsProps {
  /** Accessible name of the tab list. */
  label: string
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  /** Content of the active tab. */
  children: ReactNode
}

const TAB_CLASSES = { tab: classes.tab, tabLabel: classes.tabLabel, panel: classes.tabPanel }

/** Controlled tabs. Put the tabs outside cards and the content in a SurfaceCard. */
export function Tabs({ label, items, value, onChange, children }: TabsProps) {
  return (
    <MantineTabs
      value={value}
      onChange={(next) => next && onChange(next)}
      classNames={TAB_CLASSES}
      keepMounted={false}
    >
      <MantineTabs.List aria-label={label}>
        {items.map((item) => (
          <MantineTabs.Tab key={item.value} value={item.value}>
            {item.label}
          </MantineTabs.Tab>
        ))}
      </MantineTabs.List>
      {items.map((item) => (
        <MantineTabs.Panel key={item.value} value={item.value}>
          {item.value === value ? children : null}
        </MantineTabs.Panel>
      ))}
    </MantineTabs>
  )
}
