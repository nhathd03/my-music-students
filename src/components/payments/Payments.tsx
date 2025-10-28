import { Plus } from 'lucide-react';
import { usePayments } from './hooks/usePayments';
import PaymentSummary from './PaymentSummary';
import PaymentForm from './PaymentForm';
import PaymentFilter from './PaymentFilter';
import PaymentTable from './PaymentTable';
import '../Payments.css';

/**
 * Payments Component (Main Container)
 * 
 * This is the main container component that orchestrates all payment-related
 * functionality. It delegates specific responsibilities to smaller,
 * focused sub-components:
 * 
 * - PaymentSummary: Displays total earnings and payment count
 * - PaymentForm: Handles adding/editing payment records
 * - PaymentFilter: Allows filtering payments by student
 * - PaymentTable: Displays the list of payments
 * 
 * Business logic is managed by the usePayments custom hook,
 * keeping this component focused on composition and layout.
 */
export default function Payments() {
  const {
    // State
    payments,
    students,
    loading,
    showForm,
    editingPayment,
    selectedStudent,
    formData,
    totalAmount,

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    updateFormData,
    setShowForm,
    setSelectedStudent,
  } = usePayments();

  // Loading state
  if (loading) {
    return <div className="payments-loading">Loading payments...</div>;
  }

  return (
    <div className="payments-container">
      {/* Header Section */}
      <div className="payments-header">
        <div>
          <h2>Payments</h2>
          <p className="payments-subtitle">Track student payments and earnings</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} />
          Add Payment
        </button>
      </div>

      {/* Summary Section - Shows total received */}
      <PaymentSummary 
        totalAmount={totalAmount} 
        paymentCount={payments.length} 
      />

      {/* Form Section - Add/Edit payments */}
      {showForm && (
        <PaymentForm
          students={students}
          formData={formData}
          editingPayment={editingPayment}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onChange={updateFormData}
        />
      )}

      {/* Filter Section - Filter by student */}
      <PaymentFilter
        students={students}
        selectedStudent={selectedStudent}
        onFilterChange={setSelectedStudent}
      />

      {/* Table Section - Display all payments */}
      <PaymentTable
        payments={payments}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

