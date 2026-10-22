import React from 'react'
import toast from 'react-hot-toast'

type ToastType = 'success' | 'error' | 'info'

interface MyToastProps {
  message: string
  type: ToastType
}

const MyToast: React.FC<MyToastProps> = ({ message, type }) => {
  const toastOptions = {
    style: {
      borderRadius: '10px',
      background: type === 'error' ? '#d83030' : '#333',
      color: '#fff',
      fontSize: '14px'
    },
    iconTheme: {
      primary: type === 'success' ? 'lightgreen' : 'white',
      secondary: 'black'
    },
    className: 'font-pops'
  }

  return (
    <>
      {type === 'success'
        ? toast.success(message, toastOptions)
        : type === 'info'
          ? toast(message, toastOptions)
          : toast.error(message, toastOptions)}
    </>
  )
}

export default MyToast
