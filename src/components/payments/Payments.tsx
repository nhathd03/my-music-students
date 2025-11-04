import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { usePayments } from './hooks/usePayments';
import PaymentSummary from './PaymentSummary';
import PaymentForm from './PaymentForm';
import PaymentFilter from './PaymentFilter';
import PaymentTable from './PaymentTable';
import './styles/Payments.css';

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const processedStateRef = useRef(false);
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
    unpaidLessons,
    loadingLessons,

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    updateFormData,
    setShowForm,
    setSelectedStudent,
  } = usePayments();

  // Store lessonToPay to pre-select after unpaidLessons loads
  const lessonToPayRef = useRef<{ id: number; date: string; studentId: number } | null>(null);

  useEffect(() => {
    const state = location.state as { lessonToPay?: { id: number; date: string; studentId: number } };
    if (state?.lessonToPay && !processedStateRef.current) {
      processedStateRef.current = true;
      lessonToPayRef.current = state.lessonToPay;
      
      // Format the lesson date for the payment date field
      const lessonDate = new Date(state.lessonToPay.date);
      const paymentDate = format(lessonDate, 'yyyy-MM-dd');
      
      // Normalize the lesson date to ISO format to match unpaidLessons format
      const normalizedLessonDate = lessonDate.toISOString();
      
      updateFormData({
        student_id: state.lessonToPay.studentId.toString(),
        selectedLessons: [{ id: state.lessonToPay.id, date: normalizedLessonDate }],
        date: paymentDate,
      });
      
      setShowForm(true);
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, updateFormData, setShowForm, navigate]);
  
  useEffect(() => {
    return () => {
      processedStateRef.current = false;
    };
  }, []);

  // Pre-select lesson and calculate amount when unpaidLessons load
  useEffect(() => {
    if (showForm && unpaidLessons.length > 0 && lessonToPayRef.current) {
      const lessonToPay = lessonToPayRef.current;
      const normalizedDate = new Date(lessonToPay.date).toISOString();
      
      // Find the matching lesson in unpaidLessons (normalize dates for comparison)
      const matchingLesson = unpaidLessons.find(l => {
        const lessonDateISO = new Date(l.date).toISOString();
        return l.id === lessonToPay.id && lessonDateISO === normalizedDate;
      });
      
      if (matchingLesson) {
        // Check if already selected (normalize dates for comparison)
        const isAlreadySelected = formData.selectedLessons.some(selected => {
          const selectedDateISO = new Date(selected.date).toISOString();
          const matchingDateISO = new Date(matchingLesson.date).toISOString();
          return selected.id === matchingLesson.id && selectedDateISO === matchingDateISO;
        });
        
        if (!isAlreadySelected) {
          // Pre-select the lesson
          updateFormData({
            selectedLessons: [{ id: matchingLesson.id, date: matchingLesson.date }],
          });
        }
        
        // Calculate total amount if not already set
        if (formData.total_amount === '') {
          const student = students.find(s => s.id === parseInt(formData.student_id));
          if (student && student.rate) {
            const totalAmount = ((student.rate / 60) * matchingLesson.duration).toFixed(2);
            updateFormData({ total_amount: totalAmount });
          }
        }
      }
      
      // Clear the ref after processing
      lessonToPayRef.current = null;
    }
  }, [showForm, unpaidLessons, formData.selectedLessons, formData.student_id, formData.total_amount, students, updateFormData]);

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

      {/* Form Modal - Add/Edit payments */}
      {showForm && (
        <PaymentForm
          students={students}
          formData={formData}
          editingPayment={editingPayment}
          unpaidLessons={unpaidLessons}
          loadingLessons={loadingLessons}
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

