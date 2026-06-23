import Head from 'next/head';
import PaystubForm from '../components/PaystubForm';

export default function Home() {
  return (
    <>
      <Head>
        <title>Paystub Generator - Professional Tax-Compliant Paystubs</title>
        <meta name="description" content="Generate professional, tax-compliant paystubs instantly" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PaystubForm />
    </>
  );
}
