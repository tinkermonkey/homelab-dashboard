import React, { useState } from 'react'
import './Table.css'
import { Icon } from './Icon'

export interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode
}

export interface TableProps<T extends Record<string, any>> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  selectable?: boolean
  selectedRows?: (string | number)[]
  onSelectRows?: (rowKeys: (string | number)[]) => void
  onSort?: (key: string, direction: 'asc' | 'desc' | null) => void
  className?: string
}

const TableInner = React.forwardRef(
  <T extends Record<string, any>,>(
    {
      columns,
      data,
      rowKey,
      selectable = true,
      selectedRows = [],
      onSelectRows,
      onSort,
      className = '',
      ...props
    }: TableProps<T>,
    ref: React.Ref<HTMLTableElement>,
  ) => {
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    const getRowKey = (row: T, index: number) => {
      if (typeof rowKey === 'function') {
        return rowKey(row, index)
      }
      return row[rowKey as keyof T]
    }

    const handleSelectAll = () => {
      if (selectedRows.length === data.length) {
        onSelectRows?.([])
      } else {
        onSelectRows?.(data.map((row, idx) => getRowKey(row, idx)))
      }
    }

    const handleSelectRow = (rowKeyValue: string | number) => {
      if (selectedRows.includes(rowKeyValue)) {
        onSelectRows?.(selectedRows.filter(k => k !== rowKeyValue))
      } else {
        onSelectRows?.([...selectedRows, rowKeyValue])
      }
    }

    const handleSort = (key: string) => {
      if (sortKey === key) {
        // Cycle through states: asc -> desc -> clear
        if (sortDirection === 'asc') {
          setSortDirection('desc')
          onSort?.(key, 'desc')
        } else {
          // Clear the sort
          setSortKey(null)
          onSort?.(key, null)
        }
      } else {
        // New column, start with asc
        setSortKey(key)
        setSortDirection('asc')
        onSort?.(key, 'asc')
      }
    }

    const classNames = ['table', className].filter(Boolean).join(' ')

    return (
      <table ref={ref} className={classNames} {...props}>
        <thead className="table__head">
          <tr className="table__row">
            {selectable && (
              <th className="table__header table__header--checkbox" style={{ width: '30px' }}>
                <input
                  type="checkbox"
                  className="table__checkbox"
                  checked={selectedRows.length === data.length && data.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map(column => (
              <th
                key={String(column.key)}
                className={`table__header ${column.sortable ? 'table__header--sortable' : ''}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(String(column.key))}
              >
                <div className="table__header-content">
                  {column.label}
                  {sortKey === String(column.key) && sortDirection && (
                    <Icon
                      name={sortDirection === 'asc' ? 'chevronUp' : 'chevronDown'}
                      size={14}
                      className="table__sort-icon"
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {data.map((row, index) => {
            const rowKeyValue = getRowKey(row, index)
            const isSelected = selectedRows.includes(rowKeyValue)
            return (
              <tr key={rowKeyValue} data-row-key={rowKeyValue} className={`table__row ${isSelected ? 'table__row--selected' : ''}`}>
                {selectable && (
                  <td className="table__cell table__cell--checkbox">
                    <input
                      type="checkbox"
                      className="table__checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(rowKeyValue)}
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={`${rowKeyValue}-${String(column.key)}`} className="table__cell">
                    {column.render ? column.render(row[column.key as keyof T], row, index) : row[column.key as keyof T]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }
)

TableInner.displayName = 'Table'

export const Table = TableInner as <T extends Record<string, any>>(
  props: TableProps<T> & React.RefAttributes<HTMLTableElement>
) => React.ReactElement | null

export default Table
