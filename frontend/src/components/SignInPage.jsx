import { useEffect, useRef } from 'react'

export default function SignInPage({ googleClientId }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    if (window.google?.accounts?.id && buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      })
    }
  }, [googleClientId])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <h1 className="text-[15px] font-semibold tracking-tight text-white mb-8">
        INVESTMENT ANALYSIS
      </h1>
      <p className="text-[13px] text-[#525252] mb-6 tracking-wide">
        SIGN IN TO CONTINUE
      </p>
      <div ref={buttonRef} data-testid="google-signin-button" />
    </div>
  )
}
