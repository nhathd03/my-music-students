import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { PaymentFilterProps } from './types';

/**
 * PaymentFilter Component
 * 
 * Professional filter UI with:
 * - Main search bar for quick filtering
 * - Expandable advanced filters panel
 * - Clean, minimal design
 */
export default function PaymentFilter({
  students,
  filters,
  onFilterChange,
  onClearFilters,
}: PaymentFilterProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = 
    filters.studentId !== 'all' ||
    filters.studentSearch.trim() !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.method !== 'all' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '';

  // Count active filters
  const activeFilterCount = [
    filters.studentId !== 'all',
    filters.studentSearch.trim() !== '',
    filters.dateFrom !== '',
    filters.dateTo !== '',
    filters.method !== 'all',
    filters.amountMin !== '',
    filters.amountMax !== '',
  ].filter(Boolean).length;

  return (
    <div className="payment-filter">
      {/* Main Search Bar */}
      <div className="payment-filter-main">
        <div className="search-input-wrapper payment-filter-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input search-input"
            placeholder="Search payments by student name, email, or notes..."
            value={filters.studentSearch}
            onChange={(e) => {
              onFilterChange({ 
                studentSearch: e.target.value,
                studentId: 'all' // Reset dropdown when searching
              });
            }}
          />
        </div>
        
        <div className="payment-filter-actions">
          <button
            type="button"
            className={`btn btn-secondary payment-filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
            {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary payment-filter-clear"
              onClick={onClearFilters}
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel (Expandable) - Positioned below search bar */}
      {showAdvancedFilters && (
        <div className="payment-filter-advanced">
          <div className="payment-filter-grid">
            {/* Student Dropdown */}
            <div className="form-group">
              <label className="label" htmlFor="filter-student">
                Student
              </label>
      <select
        id="filter-student"
        className="input"
                value={filters.studentId}
                onChange={(e) => onFilterChange({ studentId: e.target.value })}
      >
        <option value="all">All Students</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name}
          </option>
        ))}
      </select>
            </div>

            {/* Date From */}
            <div className="form-group">
              <label className="label" htmlFor="filter-date-from">
                From Date
              </label>
              <input
                id="filter-date-from"
                type="date"
                className="input"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
              />
            </div>

            {/* Date To */}
            <div className="form-group">
              <label className="label" htmlFor="filter-date-to">
                To Date
              </label>
              <input
                id="filter-date-to"
                type="date"
                className="input"
                value={filters.dateTo}
                onChange={(e) => onFilterChange({ dateTo: e.target.value })}
                min={filters.dateFrom || undefined}
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="label" htmlFor="filter-method">
                Payment Method
              </label>
              <select
                id="filter-method"
                className="input"
                value={filters.method}
                onChange={(e) => onFilterChange({ method: e.target.value })}
              >
                <option value="all">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Venmo">Venmo</option>
                <option value="PayPal">PayPal</option>
                <option value="Zelle">Zelle</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Amount Min */}
            <div className="form-group">
              <label className="label" htmlFor="filter-amount-min">
                Min Amount ($)
              </label>
              <input
                id="filter-amount-min"
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0.00"
                value={filters.amountMin}
                onChange={(e) => onFilterChange({ amountMin: e.target.value })}
              />
            </div>

            {/* Amount Max */}
            <div className="form-group">
              <label className="label" htmlFor="filter-amount-max">
                Max Amount ($)
              </label>
              <input
                id="filter-amount-max"
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="0.00"
                value={filters.amountMax}
                onChange={(e) => onFilterChange({ amountMax: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

