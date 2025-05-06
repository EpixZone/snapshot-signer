import { Layout, Wallet } from "@/components";
import { EVMProvider } from "@/components/evm/EVMProvider";
import { EVMWallet } from "@/components/evm/EVMWallet";
import { Box, Text } from "@interchain-ui/react";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [showX42Interface, setShowX42Interface] = useState(false);

  useEffect(() => {
    // Check for x42 parameter in URL
    const { x42 } = router.query;
    setShowX42Interface(!!x42);
  }, [router.query]);

  return (
    <Layout>
      <div style={{ padding: '2rem' }}>
        {showX42Interface ? (
          <Box>
            <Wallet />
          </Box>
        ) : (
          <Box>
            <EVMProvider>
              <EVMWallet />
            </EVMProvider>
          </Box>
        )}
      </div>
    </Layout>
  );
}
