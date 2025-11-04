import type { PaymentFilterProps } from './types';

/**
 * PaymentFilter Component
 * 
 * Allows filtering the payment list by student.
 * Displays a dropdown with "All Students" option plus individual students.
 */
export default function PaymentFilter({
  students,
  selectedStudent,
  onFilterChange,
}: PaymentFilterProps) {
  return (
    <div className="payment-filter">
      <label className="label" htmlFor="filter-student">Filter by Student:</label>
      <select
        id="filter-student"
        className="input payment-filter-select"
        value={selectedStudent}
        onChange={(e) => onFilterChange(e.target.value)}
      >
        <option value="all">All Students</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name}
          </option>
        ))}
      </select>
    </div>
  );
}

