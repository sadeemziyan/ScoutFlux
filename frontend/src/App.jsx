import CompanyForm from './components/CompanyForm'

function App() {
  function handleSubmit(payload) {
    console.log('Form payload:', payload)
  }

  return <CompanyForm onSubmit={handleSubmit} />
}

export default App