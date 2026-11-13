import { QuestionType, QuestionConfig } from './database.types'
import { 
  Type, 
  AlignLeft, 
  List, 
  CheckSquare, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  Star, 
  Gauge, 
  ThumbsUp, 
  Upload, 
  Link,
  FileText,
  LucideIcon
} from 'lucide-react'

export interface QuestionTypeInfo {
  type: QuestionType
  label: string
  description: string
  icon: LucideIcon
  defaultConfig: Partial<QuestionConfig>
}

export const questionTypes: QuestionTypeInfo[] = [
  {
    type: 'statement',
    label: 'Texto inicial / Explicación',
    description: 'Texto informativo con botón aceptar para continuar',
    icon: FileText,
    defaultConfig: {
      buttonText: 'Aceptar',
    },
  },
  {
    type: 'short_text',
    label: 'Texto corto',
    description: 'Campo de texto de una sola línea',
    icon: Type,
    defaultConfig: {
      placeholder: 'Escribí tu respuesta aquí...',
    },
  },
  {
    type: 'long_text',
    label: 'Texto largo',
    description: 'Área de texto de varias líneas',
    icon: AlignLeft,
    defaultConfig: {
      placeholder: 'Escribí tu respuesta aquí...',
    },
  },
  {
    type: 'dropdown',
    label: 'Lista desplegable',
    description: 'Seleccionar una opción de una lista',
    icon: List,
    defaultConfig: {
      options: ['Opción 1', 'Opción 2', 'Opción 3'],
    },
  },
  {
    type: 'checkboxes',
    label: 'Casillas de verificación',
    description: 'Seleccionar múltiples opciones de una lista',
    icon: CheckSquare,
    defaultConfig: {
      options: ['Opción 1', 'Opción 2', 'Opción 3'],
    },
  },
  {
    type: 'email',
    label: 'Correo electrónico',
    description: 'Campo para dirección de correo',
    icon: Mail,
    defaultConfig: {
      placeholder: 'nombre@ejemplo.com',
    },
  },
  {
    type: 'phone',
    label: 'Teléfono',
    description: 'Campo para número de teléfono',
    icon: Phone,
    defaultConfig: {
      placeholder: '+54 11 0000-0000',
    },
  },
  {
    type: 'number',
    label: 'Número',
    description: 'Campo numérico',
    icon: Hash,
    defaultConfig: {
      placeholder: '0',
    },
  },
  {
    type: 'date',
    label: 'Fecha',
    description: 'Selector de fecha',
    icon: Calendar,
    defaultConfig: {},
  },
  {
    type: 'rating',
    label: 'Calificación',
    description: 'Calificación con estrellas (1-5)',
    icon: Star,
    defaultConfig: {
      minValue: 1,
      maxValue: 5,
    },
  },
  {
    type: 'opinion_scale',
    label: 'Escala de opinión',
    description: 'Escala numérica (1-10)',
    icon: Gauge,
    defaultConfig: {
      minValue: 1,
      maxValue: 10,
    },
  },
  {
    type: 'yes_no',
    label: 'Sí / No',
    description: 'Elección simple entre Sí o No',
    icon: ThumbsUp,
    defaultConfig: {},
  },
  {
    type: 'file_upload',
    label: 'Subir archivo',
    description: 'Subir imágenes o PDFs',
    icon: Upload,
    defaultConfig: {
      allowedFileTypes: ['image/*', 'application/pdf'],
      maxFileSize: 10, // MB
    },
  },
  {
    type: 'url',
    label: 'Sitio web (URL)',
    description: 'Campo para dirección web',
    icon: Link,
    defaultConfig: {
      placeholder: 'https://ejemplo.com',
    },
  },
]

export function getQuestionTypeInfo(type: QuestionType): QuestionTypeInfo | undefined {
  return questionTypes.find(qt => qt.type === type)
}

export function createDefaultQuestion(type: QuestionType): QuestionConfig {
  const typeInfo = getQuestionTypeInfo(type)
  const id = crypto.randomUUID()
  
  return {
    id,
    type,
    title: '',
    description: '',
    required: false,
    ...typeInfo?.defaultConfig,
  }
}

