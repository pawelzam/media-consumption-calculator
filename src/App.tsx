import React from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import ConsumptionForm from './components/ConsumptionForm';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ width: '90%', maxWidth: '1800px' }}>
        <ConsumptionForm />
      </Container>
    </ThemeProvider>
  );
}

export default App;
