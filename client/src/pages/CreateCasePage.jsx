import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import casesService from '../services/casesService';
import categoriesService from '../services/categoriesService';
import CaseForm from '../components/CaseForm';
import { useToast } from '../context/ToastContext';

export default function CreateCasePage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoriesService.getCategories().then(({ data }) => setCategories(data));
  }, []);

  async function handleSubmit(formData) {
    await casesService.createCase(formData);
    addToast('Case created successfully!');
    navigate('/admin');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link to="/admin" className="hover:text-blue-600 transition-colors">Admin</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-800 font-medium">New Case</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Create New Case</h1>
        <p className="text-gray-500 mt-1">Fill in the details to publish a new charity case</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <CaseForm
          categories={categories}
          submitLabel="Create Case"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
