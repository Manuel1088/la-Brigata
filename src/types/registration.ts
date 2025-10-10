export interface RegistrationFlow {
  type: 'COMPANY' | 'EMPLOYEE' | 'CANDIDATE'
  data: CompanyRegistration | EmployeeRegistration | CandidateRegistration
}

export interface CompanyRegistration {
  companyName: string
  fiscalCode: string
  address: string
  phone: string
  email: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerRole: 'PROPRIETARIO_LAVORATORE' | 'PROPRIETARIO_NON_LAVORATORE' | 'GENERAL_MANAGER'
  password: string
  restaurantName?: string
  restaurantAddress?: string
}

export interface EmployeeRegistration {
  name: string
  email: string
  phone: string
  password: string
  department: 'cucina' | 'sala' | 'bar'
  role: string
  userType: 'EMPLOYEE'
  companyFiscalCode: string
  informalCompanyData?: {
    name: string
    address: string
    city: string
    type: string
    description?: string
  }
  teamName?: string
}

export interface CandidateRegistration {
  name: string
  email: string
  phone: string
  password: string
  department: 'cucina' | 'sala' | 'bar'
  userType: 'CANDIDATE'
  candidateData: {
    experience: Array<{
      position: string
      company: string
      duration: string
      description: string
    }>
    skills: string[]
    availability: 'full-time' | 'part-time' | 'weekend'
    desiredSalary?: number
    bio: string
  }
}


