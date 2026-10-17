//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/create-routes/
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// The kit saves every answer to req.session.data before these routes run,
// so the routes below only validate answers and decide where to go next.

const destinations = {
  moon: { stayField: 'moon-stay', stayPage: '/how-long-on-moon' },
  mars: { stayField: 'mars-stay', stayPage: '/how-long-on-mars' }
}

const POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/

// Returns the first question the user still needs to answer, or null if
// they have answered everything needed for the check your answers page
function firstUnansweredPage (data) {
  const destination = destinations[data.destination]

  if (!destination) return '/destination'
  if (!data[destination.stayField]) return destination.stayPage
  if (!data['full-name']) return '/full-name'
  if (!data['address-line-1'] || !data['address-town'] || !data['address-postcode']) return '/address'

  return null
}

// Once the user has reached check your answers, any change takes them
// straight back there instead of through the rest of the journey
function nextPage (data, defaultPage) {
  if (data['checking-answers'] && !firstUnansweredPage(data)) {
    return '/check-your-answers'
  }
  return defaultPage
}

// Re-shows the page with an error summary and inline error messages.
// errors is a list of { field, text } in the order fields appear on the page.
function renderWithErrors (res, view, errors) {
  res.render(view, {
    errors: Object.fromEntries(errors.map(error => [error.field, { text: error.text }])),
    errorList: errors.map(error => ({ text: error.text, href: '#' + error.field }))
  })
}

// Where do you want to travel to?
router.post('/destination', (req, res) => {
  const data = req.session.data
  const destination = destinations[data.destination]

  // Starting a new application
  delete data['application-sent']
  delete data['sent-destination']

  if (!destination) {
    return renderWithErrors(res, 'destination', [
      { field: 'destination', text: 'Select where you want to travel to' }
    ])
  }

  // Branching: each destination has its own length of stay question.
  // Remove the other destination's answer so it cannot be shown or sent.
  for (const [key, other] of Object.entries(destinations)) {
    if (key !== data.destination) delete data[other.stayField]
  }

  if (data['checking-answers'] && data[destination.stayField]) {
    return res.redirect(nextPage(data, destination.stayPage))
  }

  res.redirect(destination.stayPage)
})

// How long do you want to stay on the Moon? / on Mars?
for (const [key, destination] of Object.entries(destinations)) {
  const view = destination.stayPage.slice(1)
  const placeName = key === 'moon' ? 'the Moon' : 'Mars'

  // Only show this question to users who chose this destination
  router.get(destination.stayPage, (req, res, next) => {
    if (req.session.data.destination !== key) {
      return res.redirect('/destination')
    }
    next()
  })

  router.post(destination.stayPage, (req, res) => {
    const data = req.session.data

    if (data.destination !== key) {
      return res.redirect('/destination')
    }

    if (!data[destination.stayField]) {
      return renderWithErrors(res, view, [
        { field: destination.stayField, text: `Select how long you want to stay on ${placeName}` }
      ])
    }

    res.redirect(nextPage(data, '/full-name'))
  })
}

// What is your full name?
router.post('/full-name', (req, res) => {
  const data = req.session.data
  const fullName = (data['full-name'] || '').trim().replace(/\s+/g, ' ')
  data['full-name'] = fullName

  if (!fullName) {
    return renderWithErrors(res, 'full-name', [
      { field: 'full-name', text: 'Enter your full name' }
    ])
  }

  if (fullName.length > 100) {
    return renderWithErrors(res, 'full-name', [
      { field: 'full-name', text: 'Full name must be 100 characters or less' }
    ])
  }

  res.redirect(nextPage(data, '/address'))
})

// What is your address?
router.post('/address', (req, res) => {
  const data = req.session.data

  for (const field of ['address-line-1', 'address-line-2', 'address-town', 'address-county', 'address-postcode']) {
    data[field] = (data[field] || '').trim()
  }

  const errors = []

  if (!data['address-line-1']) {
    errors.push({ field: 'address-line-1', text: 'Enter address line 1, typically the building and street' })
  }

  if (!data['address-town']) {
    errors.push({ field: 'address-town', text: 'Enter town or city' })
  }

  // Accept postcodes in any case and with or without spaces, then store
  // them in the standard format, for example "sw1a2aa" becomes "SW1A 2AA"
  const postcode = data['address-postcode'].replace(/\s+/g, '').toUpperCase()

  if (!postcode) {
    errors.push({ field: 'address-postcode', text: 'Enter postcode' })
  } else if (!POSTCODE_PATTERN.test(postcode)) {
    errors.push({ field: 'address-postcode', text: 'Enter a full UK postcode' })
  } else {
    data['address-postcode'] = postcode.slice(0, -3) + ' ' + postcode.slice(-3)
  }

  if (errors.length) {
    return renderWithErrors(res, 'address', errors)
  }

  res.redirect('/check-your-answers')
})

// Check your answers
router.get('/check-your-answers', (req, res) => {
  const data = req.session.data
  const unansweredPage = firstUnansweredPage(data)

  if (unansweredPage) {
    return res.redirect(unansweredPage)
  }

  data['checking-answers'] = true
  res.render('check-your-answers')
})

router.post('/check-your-answers', (req, res) => {
  if (firstUnansweredPage(req.session.data)) {
    return res.redirect('/check-your-answers')
  }

  // Like a real service, clear the answers once the application is sent,
  // keeping only what the confirmation page needs
  req.session.data = {
    'application-sent': true,
    'sent-destination': req.session.data.destination
  }
  res.redirect('/confirmation')
})

// Application complete
router.get('/confirmation', (req, res, next) => {
  if (!req.session.data['application-sent']) {
    return res.redirect('/')
  }
  next()
})
