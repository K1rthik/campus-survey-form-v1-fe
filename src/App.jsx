import React from 'react'
import './App.css'
import SurveyLanding from './components/SurveyLanding';
import DomainLanding from './components/DomainLanding';
import MenuForm from './components/MenuForm';
import CafeteriaForm from './components/CafeteriaForm';
import OurCampus from './components/OurCampus';
import Security from './components/Security';
import EmployeeForm from './components/EmployeeForm';
import {BrowserRouter as Router, Route, Routes } from 'react-router-dom'
 
function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<SurveyLanding/>} />
          <Route path="/domain-landing" element={<DomainLanding />} />
          <Route path="/menu-form" element={<MenuForm />} />
          <Route path="/cafeteria-form" element={<CafeteriaForm />} />
          <Route path="/our-campus" element={<OurCampus />} />
          <Route path="/security" element={<Security />} />
          <Route path="/employeeForm" element={<EmployeeForm />} />
        </Routes>
      </Router>
    </>
  )
}
 
export default App;