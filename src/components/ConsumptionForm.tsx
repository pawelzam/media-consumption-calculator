import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Paper,
  Typography,
  Button,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ConsumptionData {
  date: dayjs.Dayjs | null;
  power: string;
  gas: string;
  water: string;
  gasPercentage: string;
}

interface SavedConsumptionData {
  guid: string;
  date: string;
  power: string;
  gas: string;
  water: string;
  gasPercentage: string;
}

interface GasCalculation {
  date: string;
  consumption: number;
  netPrice: number;
  grossPrice: number;
  consumptionInKWh: number;
}

interface PowerCalculation {
  date: string;
  consumption: number;
  netPrice: number;
  grossPrice: number;
  details: {
    activeEnergy: number;
    resFee: number;
    qualityComponent: number;
    networkFee: number;
    transitionFee: number;
    fixedTransmissionFee: number;
    subscriptionFee: number;
    commercialFee: number;
    fixedCapacityFee: number;
  };
}

interface WaterCalculation {
  date: string;
  consumption: number;
  netPrice: number;
  grossPrice: number;
  details: {
    waterSubscriptionFee: number;
    savageSubscriptionFee: number;
    waterConsumptionFee: number;
    savageConsumptionFee: number;
  };
}

interface ChartData {
  date: string;
  power: number;
  gas: number;
  water: number;
  powerCost: number;
  gasCost: number;
  waterCost: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`consumption-tabpanel-${index}`}
      aria-labelledby={`consumption-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ width: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ConsumptionForm: React.FC = () => {
  const [formData, setFormData] = useState<ConsumptionData>({
    date: dayjs(),
    power: '',
    gas: '',
    water: '',
    gasPercentage: '100'
  });

  const [selectedApartment, setSelectedApartment] = useState<string>('');
  const [apartments, setApartments] = useState<string[]>([]);
  const [savedData, setSavedData] = useState<SavedConsumptionData[]>([]);
  const [editingGuid, setEditingGuid] = useState<string | null>(null);
  const [editData, setEditData] = useState<SavedConsumptionData | null>(null);
  const [gasCalculations, setGasCalculations] = useState<GasCalculation[]>([]);
  const [powerCalculations, setPowerCalculations] = useState<PowerCalculation[]>([]);
  const [waterCalculations, setWaterCalculations] = useState<WaterCalculation[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    isError: false
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowGuid, setSelectedRowGuid] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Fetch available apartments
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/apartments');
        if (!response.ok) {
          throw new Error('Failed to fetch apartments');
        }
        const data = await response.json();
        setApartments(data);
        if (data.length > 0) {
          setSelectedApartment(data[0]);
        }
      } catch (error) {
        console.error('Error fetching apartments:', error);
        setNotification({
          open: true,
          message: 'Failed to fetch apartments',
          isError: true
        });
      }
    };

    fetchApartments();
  }, []);

  // Fetch saved data when apartment changes
  useEffect(() => {
    if (selectedApartment) {
      fetchSavedData();
      fetchGasCalculations();
      fetchPowerCalculations();
      fetchWaterCalculations();
    }
  }, [selectedApartment]);

  const fetchSavedData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${selectedApartment}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setSavedData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setNotification({
        open: true,
        message: 'Failed to fetch saved data',
        isError: true
      });
    }
  };

  const fetchGasCalculations = async () => {
    if (!selectedApartment) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${encodeURIComponent(selectedApartment)}/gas-calculations`);
      if (response.status === 400) {
        // This is expected when there's insufficient data
        setGasCalculations([]);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch gas calculations');
      }
      const data = await response.json();
      setGasCalculations(data);
    } catch (error) {
      console.error('Error fetching gas calculations:', error);
      setGasCalculations([]);  // Set empty array on error
    }
  };

  const fetchPowerCalculations = async () => {
    if (!selectedApartment) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${encodeURIComponent(selectedApartment)}/power-calculations`);
      if (response.status === 400) {
        // This is expected when there's insufficient data
        setPowerCalculations([]);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch power calculations');
      }
      const data = await response.json();
      setPowerCalculations(data);
    } catch (error) {
      console.error('Error fetching power calculations:', error);
      setPowerCalculations([]);  // Set empty array on error
    }
  };

  const fetchWaterCalculations = async () => {
    if (!selectedApartment) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${encodeURIComponent(selectedApartment)}/water-calculations`);
      if (response.status === 400) {
        // This is expected when there's insufficient data
        setWaterCalculations([]);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch water calculations');
      }
      const data = await response.json();
      setWaterCalculations(data);
    } catch (error) {
      console.error('Error fetching water calculations:', error);
      setWaterCalculations([]);  // Set empty array on error
    }
  };

  const handleDelete = async (guid: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${selectedApartment}/${guid}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete data');
      }

      setNotification({
        open: true,
        message: 'Data deleted successfully!',
        isError: false
      });

      await fetchSavedData();
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to delete data. Please try again.',
        isError: true
      });
    }
  };

  const handleEdit = (row: SavedConsumptionData) => {
    setEditingGuid(row.guid);
    setEditData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingGuid(null);
    setEditData(null);
  };

  const handleEditChange = (field: keyof SavedConsumptionData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (editData) {
      setEditData({
        ...editData,
        [field]: event.target.value
      });
    }
  };

  const handleEditDateChange = (newDate: dayjs.Dayjs | null) => {
    if (editData) {
      setEditData({
        ...editData,
        date: newDate?.format('YYYY-MM-DD') || editData.date
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editData || !editingGuid) return;

    try {
      const response = await fetch(`http://localhost:3001/api/consumption/${selectedApartment}/${editingGuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error('Failed to update data');
      }

      setNotification({
        open: true,
        message: 'Data updated successfully!',
        isError: false
      });

      setEditingGuid(null);
      setEditData(null);
      
      // Refresh all calculations
      await Promise.all([
        fetchSavedData(),
        fetchGasCalculations(),
        fetchPowerCalculations(),
        fetchWaterCalculations()
      ]);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to update data. Please try again.',
        isError: true
      });
    }
  };

  const handleInputChange = (field: keyof ConsumptionData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (field === 'power' || field === 'gas' || field === 'water' || field === 'gasPercentage') {
      if (value === '' || (Number(value) >= 0)) {
        setFormData(prev => ({
          ...prev,
          [field]: value
        }));
      }
    }
  };

  const handleDateChange = (newDate: dayjs.Dayjs | null) => {
    setFormData(prev => ({
      ...prev,
      date: newDate
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!selectedApartment) {
        setNotification({
          open: true,
          message: 'Please select an apartment',
          isError: true
        });
        return;
      }

      if (!formData.date) {
        setNotification({
          open: true,
          message: 'Please select a date',
          isError: true
        });
        return;
      }

      if (!formData.power || !formData.gas || !formData.water) {
        setNotification({
          open: true,
          message: 'Please fill in all consumption values',
          isError: true
        });
        return;
      }

      const dataToSubmit = {
        date: formData.date.format('YYYY-MM-DD'),
        power: formData.power,
        gas: formData.gas,
        water: formData.water,
        gasPercentage: formData.gasPercentage
      };

      const response = await fetch(`http://localhost:3001/api/consumption/${selectedApartment}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();
      console.log('Save response:', result);

      setNotification({
        open: true,
        message: 'Data saved successfully!',
        isError: false
      });

      setFormData({
        date: dayjs(),
        power: '',
        gas: '',
        water: '',
        gasPercentage: '100'
      });

      await fetchSavedData();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save data',
        isError: true
      });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, guid: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowGuid(guid);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowGuid(null);
  };

  const handleEditClick = () => {
    if (selectedRowGuid) {
      const row = savedData.find(data => data.guid === selectedRowGuid);
      if (row) {
        handleEdit(row);
      }
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedRowGuid) {
      handleDelete(selectedRowGuid);
    }
    handleMenuClose();
  };

  const getGasCalculationForDate = (date: string) => {
    return gasCalculations.find(calc => calc.date === date);
  };

  const getPowerCalculationForDate = (date: string) => {
    return powerCalculations.find(calc => calc.date === date);
  };

  const getWaterCalculationForDate = (date: string) => {
    return waterCalculations.find(calc => calc.date === date);
  };

  const refreshData = async () => {
    await fetchSavedData();
    await fetchGasCalculations();
    await fetchPowerCalculations();
    await fetchWaterCalculations();
  };

  const renderEditRow = (row: SavedConsumptionData) => {
    if (!editData) return null;
    
    const gasCalc = getGasCalculationForDate(row.date);
    const powerCalc = getPowerCalculationForDate(row.date);
    const waterCalc = getWaterCalculationForDate(row.date);
    const powerCost = powerCalc ? powerCalc.grossPrice : 0;
    const gasCost = gasCalc ? gasCalc.grossPrice : 0;
    const waterCost = waterCalc ? waterCalc.grossPrice : 0;
    const totalCost = Number((powerCost + gasCost + waterCost).toFixed(2));
    
    return (
      <TableRow key={row.guid}>
        <TableCell sx={{ 
          whiteSpace: 'nowrap',
          width: '160px',
          minWidth: '160px'
        }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={dayjs(editData.date)}
              onChange={handleEditDateChange}
              slotProps={{ 
                textField: { 
                  size: 'small' as const,
                  sx: { 
                    width: '150px',
                    '& .MuiInputBase-root': {
                      padding: '4px 8px'
                    }
                  }
                } 
              }}
            />
          </LocalizationProvider>
        </TableCell>
        <TableCell align="right">
          <TextField
            type="number"
            value={editData.power}
            onChange={handleEditChange('power')}
            size="small"
            InputProps={{ inputProps: { min: 0 } }}
            sx={{ width: '70px' }}
          />
        </TableCell>
        <TableCell align="right">
          {powerCalc ? powerCalc.consumption.toFixed(1) : '-'}
        </TableCell>
        <TableCell align="right">
          <TextField
            type="number"
            value={editData.gas}
            onChange={handleEditChange('gas')}
            size="small"
            InputProps={{ inputProps: { min: 0 } }}
            sx={{ width: '70px' }}
          />
        </TableCell>
        <TableCell align="right">
          <TextField
            type="number"
            value={editData.gasPercentage}
            onChange={handleEditChange('gasPercentage')}
            size="small"
            InputProps={{ 
              inputProps: { min: 0, max: 100, step: 'any' },
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
              sx: {
                width: '100px',
                '& input': {
                  textAlign: 'right',
                  pr: 0.5
                }
              }
            }}
          />
        </TableCell>
        <TableCell align="right">
          {gasCalc ? gasCalc.consumption.toFixed(1) : '-'}
        </TableCell>
        <TableCell align="right">
          <TextField
            type="number"
            value={editData.water}
            onChange={handleEditChange('water')}
            size="small"
            InputProps={{ inputProps: { min: 0 } }}
            sx={{ width: '70px' }}
          />
        </TableCell>
        <TableCell align="right">
          {waterCalc ? waterCalc.consumption.toFixed(1) : '-'}
        </TableCell>
        <TableCell align="right" sx={{ color: 'text.secondary' }}>
          {powerCalc ? powerCalc.grossPrice.toFixed(2) : '-'}
        </TableCell>
        <TableCell align="right" sx={{ color: 'text.secondary' }}>
          {gasCalc ? gasCalc.grossPrice.toFixed(2) : '-'}
        </TableCell>
        <TableCell align="right" sx={{ color: 'text.secondary' }}>
          {waterCalc ? waterCalc.grossPrice.toFixed(2) : '-'}
        </TableCell>
        <TableCell 
          align="right"
          sx={{
            fontWeight: 'bold',
            bgcolor: 'action.hover'
          }}
        >
          {totalCost > 0 ? totalCost.toFixed(2) : '-'}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <IconButton
              size="small"
              onClick={handleSaveEdit}
              color="primary"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleCancelEdit}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Add this function to prepare chart data
  const prepareChartData = () => {
    if (!savedData || savedData.length === 0) {
      setChartData([]);
      return;
    }

    const data: ChartData[] = savedData
      .map(row => {
        const gasCalc = gasCalculations.find(calc => calc?.date === row.date) || null;
        const powerCalc = powerCalculations.find(calc => calc?.date === row.date) || null;
        const waterCalc = waterCalculations.find(calc => calc?.date === row.date) || null;

        return {
          date: row.date,
          power: powerCalc?.consumption || 0,
          gas: gasCalc?.consumption || 0,
          water: waterCalc?.consumption || 0,
          powerCost: powerCalc?.grossPrice || 0,
          gasCost: gasCalc?.grossPrice || 0,
          waterCost: waterCalc?.grossPrice || 0,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setChartData(data);
  };

  // Update useEffect to prepare chart data when tab changes or data updates
  useEffect(() => {
    if (currentTab === 1) {
      prepareChartData();
    }
  }, [currentTab, savedData, gasCalculations, powerCalculations, waterCalculations]);

  const renderConsumptionChart = () => (
    <Paper elevation={3} sx={{ p: 4, width: '100%', mx: 'auto' }}>
      <Box sx={{ height: 500 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="power"
                name="Power [kWh]"
                stroke="#2196F3"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="gas"
                name="Gas [m³]"
                stroke="#4CAF50"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="water"
                name="Water [m³]"
                stroke="#FFA726"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6">No consumption data available</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );

  const renderCostChart = () => (
    <Paper elevation={3} sx={{ p: 4, width: '100%', mx: 'auto', mt: 4 }}>
      <Box sx={{ height: 500 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="powerCost"
                name="Power Cost [PLN]"
                stroke="#2196F3"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="gasCost"
                name="Gas Cost [PLN]"
                stroke="#4CAF50"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="waterCost"
                name="Water Cost [PLN]"
                stroke="#FFA726"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="h6">No cost data available</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );

  const handleCopyToClipboard = (row: SavedConsumptionData) => {
    const powerCalc = getPowerCalculationForDate(row.date);
    const gasCalc = getGasCalculationForDate(row.date);
    const waterCalc = getWaterCalculationForDate(row.date);

    const powerCost = powerCalc ? powerCalc.grossPrice : 0;
    const gasCost = gasCalc ? gasCalc.grossPrice : 0;
    const waterCost = waterCalc ? waterCalc.grossPrice : 0;
    const totalCost = Number((powerCost + gasCost + waterCost).toFixed(2));

    const text = `${selectedApartment}:
Prąd ${powerCost.toFixed(2)} zł
Gaz ${gasCost.toFixed(2)} zł
Woda ${waterCost.toFixed(2)} zł
Suma ${totalCost} zł`;
    
    navigator.clipboard.writeText(text).then(() => {
      setNotification({
        open: true,
        message: 'Copied to clipboard!',
        isError: false
      });
    }).catch(() => {
      setNotification({
        open: true,
        message: 'Failed to copy to clipboard',
        isError: true
      });
    });
    handleMenuClose();
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', mt: 4, px: 2 }}>
      <Box 
        sx={{ 
          mb: 6,
          display: 'flex',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            textAlign: 'center',
            background: 'linear-gradient(45deg, #2196F3 30%, #4CAF50 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
            letterSpacing: '0.02em',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: '10%',
              width: '80%',
              height: 3,
              background: 'linear-gradient(45deg, #2196F3 30%, #4CAF50 90%)',
              borderRadius: '2px'
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -20,
              left: -30,
              right: -30,
              bottom: -20,
              background: 'linear-gradient(45deg, rgba(33,150,243,0.1) 30%, rgba(76,175,80,0.1) 90%)',
              borderRadius: '10px',
              zIndex: -1
            }
          }}
        >
          Green Gate Apartments
        </Typography>
      </Box>

      {/* Input Form Section - Moved outside tabs */}
      <Paper elevation={3} sx={{ p: 4, width: '100%', mx: 'auto', mb: 4 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 3,
          '& .MuiFormControl-root': {
            minWidth: '100%'
          }
        }}>
          <FormControl>
            <InputLabel id="apartment-select-label">Apartment</InputLabel>
            <Select
              labelId="apartment-select-label"
              value={selectedApartment}
              label="Apartment"
              onChange={(e) => setSelectedApartment(e.target.value)}
            >
              {apartments.map((apartment) => (
                <MenuItem key={apartment} value={apartment}>
                  {apartment}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  size: 'small' as const,
                  fullWidth: true,
                  sx: {
                    '& .MuiInputBase-root': {
                      height: '56px'
                    }
                  }
                }
              }}
            />
          </LocalizationProvider>
          
          <TextField
            label="Power Consumption"
            type="number"
            value={formData.power}
            onChange={handleInputChange('power')}
            required
            InputProps={{
              inputProps: { min: 0, step: 'any' }
            }}
          />

          <TextField
            label="Gas Consumption"
            type="number"
            value={formData.gas}
            onChange={handleInputChange('gas')}
            required
            InputProps={{
              inputProps: { min: 0, step: 'any' }
            }}
          />

          <TextField
            label="Gas Percentage"
            type="number"
            value={formData.gasPercentage}
            onChange={handleInputChange('gasPercentage')}
            required
            InputProps={{
              inputProps: { min: 0, max: 100, step: 'any' },
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
            helperText="Percentage of gas consumption to calculate cost (0-100%)"
          />

          <TextField
            label="Water Consumption"
            type="number"
            value={formData.water}
            onChange={handleInputChange('water')}
            required
            InputProps={{
              inputProps: { min: 0, step: 'any' }
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!selectedApartment}
            sx={{ 
              mt: 2,
              gridColumn: 'span 2',
              py: 1.5
            }}
          >
            Save Consumption Data
          </Button>
        </Box>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontSize: '1rem',
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 120
            },
            '& .Mui-selected': {
              color: 'primary.main',
              fontWeight: 600
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '2px',
              background: 'linear-gradient(45deg, #2196F3 30%, #4CAF50 90%)'
            }
          }}
        >
          <Tab label="Consumption Grid" />
          <Tab label="Charts" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        {/* Data Table Section */}
        <Paper elevation={3} sx={{ p: 4, width: '100%', mx: 'auto' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ 
              minWidth: '100%',
              '& td, & th': { 
                px: 2,
                py: 1.5,
                color: 'text.primary',
                bgcolor: 'background.paper'
              },
              '& td': {
                minWidth: '80px'
              },
              '& th': {
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                bgcolor: 'grey.100'
              }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    whiteSpace: 'nowrap',
                    width: '160px',
                    minWidth: '160px'
                  }}>
                    Date
                  </TableCell>
                  <TableCell align="right" sx={{ width: '80px' }}>Power</TableCell>
                  <TableCell align="right" sx={{ width: '120px' }}>Power Cons. [kWh]</TableCell>
                  <TableCell align="right" sx={{ width: '80px' }}>Gas</TableCell>
                  <TableCell align="right" sx={{ width: '100px' }}>Gas %</TableCell>
                  <TableCell align="right" sx={{ width: '120px' }}>Gas Cons. [m³]</TableCell>
                  <TableCell align="right" sx={{ width: '80px' }}>Water</TableCell>
                  <TableCell align="right" sx={{ width: '120px' }}>Water Cons. [m³]</TableCell>
                  <TableCell align="right" sx={{ width: '100px' }}>Power [PLN]</TableCell>
                  <TableCell align="right" sx={{ width: '100px' }}>Gas [PLN]</TableCell>
                  <TableCell align="right" sx={{ width: '100px' }}>Water [PLN]</TableCell>
                  <TableCell 
                    align="right"
                    sx={{
                      width: '100px',
                      fontWeight: 'bold',
                      bgcolor: 'action.hover'
                    }}
                  >
                    Total [PLN]
                  </TableCell>
                  <TableCell align="right" sx={{ width: '80px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {savedData.map((row, index) => {
                  const gasCalc = getGasCalculationForDate(row.date);
                  const powerCalc = getPowerCalculationForDate(row.date);
                  const waterCalc = getWaterCalculationForDate(row.date);

                  const powerCost = powerCalc ? powerCalc.grossPrice : 0;
                  const gasCost = gasCalc ? gasCalc.grossPrice : 0;
                  const waterCost = waterCalc ? waterCalc.grossPrice : 0;
                  const totalCost = Number((powerCost + gasCost + waterCost).toFixed(2));

                  return row.guid === editingGuid ? renderEditRow(row) : (
                    <TableRow 
                      key={row.guid} 
                      hover
                      sx={{
                        bgcolor: index % 2 === 1 ? 'action.hover' : 'inherit',
                        '&:hover': {
                          bgcolor: 'action.selected'
                        }
                      }}
                    >
                      <TableCell sx={{ 
                        whiteSpace: 'nowrap',
                        width: '160px',
                        minWidth: '160px'
                      }}>
                        {row.date}
                      </TableCell>
                      <TableCell align="right">{row.power}</TableCell>
                      <TableCell align="right">
                        {powerCalc ? powerCalc.consumption.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell align="right">{row.gas}</TableCell>
                      <TableCell align="right">{row.gasPercentage}%</TableCell>
                      <TableCell align="right">
                        {gasCalc ? gasCalc.consumption.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell align="right">{row.water}</TableCell>
                      <TableCell align="right">
                        {waterCalc ? waterCalc.consumption.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {powerCalc ? powerCalc.grossPrice.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {gasCalc ? gasCalc.grossPrice.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {waterCalc ? waterCalc.grossPrice.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'action.hover'
                        }}
                      >
                        {totalCost > 0 ? totalCost.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ width: '80px' }}>
                        <IconButton
                          size="small"
                          onClick={(event) => handleMenuOpen(event, row.guid)}
                          disabled={editingGuid !== null}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {savedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} align="center">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEditClick} disabled={editingGuid !== null}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleCopyToClipboard(savedData.find(data => data.guid === selectedRowGuid)!)} disabled={editingGuid !== null}>
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Copy to Clipboard</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteClick} disabled={editingGuid !== null}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </Paper>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {renderConsumptionChart()}
        {renderCostChart()}
      </TabPanel>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: notification.isError ? 'error.main' : 'success.main'
          }
        }}
      />

      <Box
        component="footer"
        sx={{
          mt: 6,
          mb: 3,
          textAlign: 'center',
          color: 'text.secondary',
          borderTop: '1px solid',
          borderColor: 'divider',
          pt: 3,
          background: 'linear-gradient(45deg, rgba(33,150,243,0.03) 30%, rgba(76,175,80,0.03) 90%)',
          borderRadius: '10px',
          px: 2,
          py: 2
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            letterSpacing: '0.02em',
            opacity: 0.9
          }}
        >
          © {new Date().getFullYear()} Symat. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default ConsumptionForm; 